using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

class Client : IDisposable
{
    public delegate void MessageCreatedEventHandler(Message message);

    class SentMessage
    {
        public required string Content { get; set; }
        public bool IsConfirmed { get; set; }
    }

    public event MessageCreatedEventHandler? OnMessageCreated;
    public Message[] Messages => _messages.ToArray();

    readonly string _hostname;
    readonly ConcurrentBag<Message> _messages;
    readonly ClientWebSocket _ws;
    readonly ConcurrentQueue<SentMessage> _sentMessageQueue;
    bool _isDisposed;
    Thread? _listenerThread;

    public Client(string hostname)
    {
        _hostname = hostname;
        _messages = new();
        _ws = new();
        _sentMessageQueue = new();

        _ws.ConnectAsync(new Uri($"ws://{_hostname}/ws"), default)
            .ContinueWith((task) =>
            {
                if (!task.IsCompletedSuccessfully) return;
                _listenerThread = new Thread(static (object? arg) =>
                {
                    Client _this = (Client)arg!;
                    while (!_this._isDisposed)
                    {
                        _this.ReceivePackets().Wait();
                    }
                });
                _listenerThread.Start(this);
            });
    }

    async Task ReceivePackets()
    {
        byte[] bytes = new byte[1024];

        WebSocketReceiveResult result = await _ws.ReceiveAsync(bytes, default);

        if (_isDisposed) return;
        if (!result.EndOfMessage) return;
        if (result.MessageType != WebSocketMessageType.Text) return;

        switch (Packet.Deserialize(Encoding.UTF8.GetString(bytes, 0, result.Count)))
        {
            case MessageCreatedPacket messageCreatedPacket:
                {
                    Message message = new()
                    {
                        Id = default,
                        Content = messageCreatedPacket.Content,
                        CreatedUtc = messageCreatedPacket.CreatedUtc,
                    };
                    _messages.Add(message);
                    OnMessageCreated?.Invoke(message);
                    break;
                }
            case SqlResultPacket sqlResultPacket:
                {
                    if (_sentMessageQueue.TryDequeue(out SentMessage? sentMessage))
                    {
                        sentMessage.IsConfirmed = true;
                    }
                    break;
                }
        }
    }

    public async Task SendMessage(string content)
    {
        SentMessage sentMessage = new() { Content = content };
        _sentMessageQueue.Enqueue(sentMessage);
        await _ws.SendAsync(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(new SendMessagePacket()
        {
            Type = "send_message",
            Content = content,
        })), WebSocketMessageType.Text, true, default);
        while (!sentMessage.IsConfirmed)
        {
            await Task.Delay(100);
        }
    }

    async public Task FetchMessages()
    {
        using HttpClient httpClient = new();
        string messagesJson = await httpClient.GetStringAsync($"http://{_hostname}/api/messages");
        Message[]? messages = JsonSerializer.Deserialize<Message[]>(messagesJson);
        if (messages == null) return;
        _messages.Clear();
        foreach (Message message in messages) _messages.Add(message);
    }

    public void Dispose()
    {
        _isDisposed = true;
        _messages.Clear();
        _ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "Client closed", default);
    }
}

class MessageComparer : IComparer<Message>
{
    public static readonly MessageComparer Instance = new();

    public int Compare(Message? x, Message? y)
    {
        if (x is null || y is null) return 0;
        return (int)(y.CreatedUtc - x.CreatedUtc);
    }
}

class Message
{
    [JsonPropertyName("id")] public required int Id { get; set; }
    [JsonPropertyName("content")] public required string Content { get; set; }
    [JsonPropertyName("createdUtc")] public required long CreatedUtc { get; set; }
}

class Packet
{
    [JsonPropertyName("type")] public required string Type { get; set; }

    public static Packet? Deserialize(string json) => JsonSerializer.Deserialize<Packet>(json)?.Type switch
    {
        "message_created" => JsonSerializer.Deserialize<MessageCreatedPacket>(json),
        "sql_result" => JsonSerializer.Deserialize<SqlResultPacket>(json),
        _ => null,
    };
}

class SendMessagePacket : Packet
{
    [JsonPropertyName("content")] public required string Content { get; set; }
}

class MessageCreatedPacket : Packet
{
    [JsonPropertyName("content")] public required string Content { get; set; }
    [JsonPropertyName("createdUtc")] public required long CreatedUtc { get; set; }
}

class SqlResultPacket : Packet
{
    [JsonPropertyName("result")] public required SqlResult Result { get; set; }
}

class SqlResult
{
    [JsonPropertyName("fieldCount")] public int FieldCount { get; set; }
    [JsonPropertyName("affectedRows")] public int AffectedRows { get; set; }
    [JsonPropertyName("insertId")] public int InsertId { get; set; }
    [JsonPropertyName("info")] public string? Info { get; set; }
    [JsonPropertyName("serverStatus")] public int ServerStatus { get; set; }
    [JsonPropertyName("warningStatus")] public int WarningStatus { get; set; }
    [JsonPropertyName("changedRows")] public int ChangedRows { get; set; }
}

static class Program
{
    async static Task Main()
    {
        using Client client = new("localhost:6789");
        await client.FetchMessages();

        while (true)
        {
            Console.Clear();
            Message[] messages = client.Messages;
            Array.Sort(messages, MessageComparer.Instance);
            Array.Reverse(messages);
            foreach (Message message in messages)
            { Console.WriteLine($"[{DateTime.UnixEpoch.AddSeconds(message.CreatedUtc):yyyy-MM-dd HH:mm:ss}] [Anonymous] {message.Content}"); }

            Console.WriteLine("Send message or enter Q to exit");
            Console.Write(" > ");
            string input = Console.ReadLine() ?? string.Empty;

            if (input == "q") break;

            if (!string.IsNullOrWhiteSpace(input))
            { await client.SendMessage(input); }
        }
    }
}
