/**
 * @template {import('./model').TableNames} TableName
 * @template TResult
 * @param {keyof import('./model').default[TableName]} column
 * @param {{ condition: string }} state
 * @param {TResult} result
 */
function condition(column, state, result) {
    const is = (value) => {
        state.condition = `${column} IS ${value}`
        return result
    }
    const isNot = (value) => {
        state.condition = `${column} IS NOT ${value}`
        return result
    }
    const eq = (value) => {
        state.condition = `${column} = ${value}`
        return result
    }
    const neq = (value) => {
        state.condition = `${column} != ${value}`
        return result
    }
    const gt = (value) => {
        state.condition = `${column} > ${value}`
        return result
    }
    const lt = (value) => {
        state.condition = `${column} < ${value}`
        return result
    }

    return {
        is,
        isNot,
        eq,
        neq,
        gt,
        lt,
        toString() { throw new Error(`Invalid query`) },
        valueOf() { throw new Error(`Invalid query`) },
    }
}

/**
 * @template {import('./model').TableNames} TableName
 * @param {ReadonlyArray<keyof import('./model').default[TableName]>} columns
 * @param {TableName} table
 */
function select(table, ...columns) {
    const whereCondition = { condition: null }
    const joinTable = { table: null, condition: null }
    let limitValue = null

    const compile = () => {
        let builder = ''
        builder += `SELECT`
        for (let i = 0; i < columns.length; i++) {
            if (i > 0) builder += `, `
            else builder += ` `
            builder += columns[i]
        }
        builder += ` FROM ${table}`
        if (joinTable.table) {
            builder += ` JOIN ${joinTable.table} ON ${joinTable.condition}`
        }
        if (whereCondition.condition) {
            builder += ` WHERE ${whereCondition.condition}`
        }
        if (limitValue !== null) {
            builder += ` LIMIT ${limitValue}`
        }
        return builder
    }

    /**
     * @param {keyof import('./model').default[TableName]} column
     */
    const where = (column) => {
        return condition(column, whereCondition, {
            ...result,
        })
    }

    /**
     * @template {import('./model').TableNames} JoinTableName
     * @param {JoinTableName} table
     * @returns {{
     *   on(column: keyof import('./model').default[TableName]): ReturnType<typeof condition<TableName, typeof result>>
     * }}
     */
    const join = (table) => {
        joinTable.table = table
        return {
            on: (column) => {
                return condition(column, joinTable, {
                    ...result,
                })
            },
        }
    }

    /**
     * @param {number} limit
     * @returns {typeof result}
     */
    const limit = (limit) => {
        limitValue = limit
        return result
    }

    const result = {
        where,
        join,
        limit,
        toString: compile,
        valueOf: compile,
    }
    return result
}

const v = select('messages', 'channelId', 'createdUtc', 'id')
    .join('users').on('id').eq('authorId')
    .where('channelId').eq(4)
console.log(v.toString())
