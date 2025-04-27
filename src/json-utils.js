const jsonUtils = {
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
    /**
     * @param {any} object
     */
    map: (object) => {
        for (const key in object) {
            object[key] = jsonUtils.replacer(key, object[key])
        }
    }
}

module.exports = jsonUtils
