# API Documentation

## Authentication endpoints



### `POST /api/register`

#### Request:
```ts
{
    username: string
    displayName?: string // Optional, if not specified the `username` will be used
    password: string
    email: string // Maybe not important now, later we can implement email verification
}
```

#### Response:
```ts
{
    token: string
}
```



### `POST /api/login`

#### Request:
```ts
{
    username: string
    password: string
}
```

#### Response:
```ts
{
    token: string
}
```


## Message endpoints



### `GET /api/messages`
Returns all the messages

#### Response:
```ts
{
    id: string
    senderId: string
    content: string
    createdAt: bigint
}
```



### `GET /api/message/:id`
Returns the given message based on the `id`

#### Response:
```ts
{
    id: string
    senderId: string
    content: string
    createdAt: bigint
}
```



### `POST /api/message`
Creates a message

#### Request:
```ts
{
    id: string
    senderId: string
    content: string
    createdAt: bigint
}
```

#### Response:
```ts
{
    id: string
    senderId: string
    content: string
    createdAt: bigint
}



### `DELETE /api/message/:id`
Deletes the specified message
