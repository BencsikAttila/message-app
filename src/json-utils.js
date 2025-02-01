module.exports = {
    /** @type {(this: any, key: string, value: any) => any} */
    replacer: (key, value) => {
        if (typeof value === 'object' && value instanceof Error) {
            return {
                ...value,
                message: value.message,
                name: value.name,
            }
        }

        return value
    },
}
