(() => {
    const helpers = {
        'JSON': function (obj) {
            return JSON.stringify(obj)
        },
        'eq': function (arg1, arg2, options) {
            return (arg1 == arg2) ? options.fn(this) : options.inverse(this)
        },
        'switch': function (value, options) {
            this.switch_value = value
            this.switch_break = false
            return options.fn(this)
        },
        'case': function (value, options) {
            if (value == this.switch_value) {
                this.switch_break = true
                return options.fn(this)
            }
        },
        'default': function (options) {
            if (this.switch_break == false) {
                return options.fn(this)
            }
        },
        'format': function (value) {
            return value
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;")
                .replace(/(\b(https?|ftp|file):\/\/[\-A-Z0-9+&@#\/%?=~_|!:,.;]*[\-A-Z09+&@#\/%=~_|])/img, '<a href="$1" target="_blank">$1</a>')
                .replace(/\*\*(.+)\*\*/img, '<b>$1</b>')
                .replace(/\*(.+)\*/img, '<i>$1</i>')
                .replace(/__(.+)__/img, '<u>$1</u>')
        },
    }

    try {
        module.exports = helpers
    } catch (error) {
        window.Handlebars.registerHelper(helpers)
    }
})()
