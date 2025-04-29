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
    }

    try {
        module.exports = helpers
    } catch (error) {
        window.Handlebars.registerHelper(helpers)
    }
})()
