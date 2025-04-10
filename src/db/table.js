const typeKeywords = {
    'INT': { mysql: 'INT', sqlite: 'INTEGER' },
    'TEXT': { mysql: 'TEXT', sqlite: 'TEXT' },
    'BIGINT': { mysql: 'BIGINT', sqlite: 'BIGINT' },
    'VARCHAR': { mysql: 'VARCHAR', sqlite: 'VARCHAR' },
    'UUID': { mysql: 'UUID', sqlite: 'UUID' },
}

/**
 * @typedef {{
 *   setPrimary(): ColumnBuilder
 *   setNullable(): ColumnBuilder
 *   setUnique(): ColumnBuilder
 *   setAutoIncrement(): ColumnBuilder
 *   referenceTo(tableName: string, columnName: string): ColumnBuilder
 * }} ColumnBuilder
 */

/**
 * @param {string} tableName
 * @returns {{
 *   addColumn(name: string, type: 'INT' | 'TEXT' | 'BIGINT' | 'UUID'): ColumnBuilder
 *   addColumn(name: string, type: 'VARCHAR', length: number): ColumnBuilder
 *   addId(): void
 *   compile(protocol: 'sqlite' | 'mysql'): string
 * }}
 */
module.exports = function(tableName) {
    /** @type {Record<string, {
     *   type: any
     *   param: any
     *   isId: boolean
     *   isPrimary: boolean
     *   isNotNull: boolean
     *   isUnique: boolean
     *   isAutoIncrement: boolean
     *   referenceTo: any
     * }>} */
    const columns = {}
    const addColumn = (name, type, param) => {
        const column = {
            type,
            param,
            isId: false,
            isPrimary: false,
            isNotNull: true,
            isUnique: false,
            isAutoIncrement: false,
            referenceTo: null,
        }
        columns[name] = column
        const columnBuilder = {
            setPrimary() { column.isPrimary = true; return columnBuilder },
            setNullable() { column.isNotNull = false; return columnBuilder },
            setUnique() { column.isUnique = true; return columnBuilder },
            setAutoIncrement() { column.isAutoIncrement = true; column.isNotNull = false; return columnBuilder },
            referenceTo(tableName, columnName) { column.referenceTo = { table: tableName, column: columnName }; return columnBuilder },
        }
        return columnBuilder
    }
    const addId = () => {
        columns['id'] = {
            type: 'INT',
            param: null,
            isId: true,
            isPrimary: true,
            isNotNull: true,
            isUnique: true,
            isAutoIncrement: true,
            referenceTo: null,
        }
    }
    const compile = (protocol) => {
        let builder = ''
        builder += 'CREATE TABLE '
        builder += 'IF NOT EXISTS '
        builder += `${tableName} `
        builder += '('
        let isFirst = true
        for (const columnName in columns) {
            const column = columns[columnName]

            if (!isFirst) builder += ', '
            isFirst = false

            if (column.isId) {
                builder += `id UUID PRIMARY KEY UNIQUE NOT NULL`
            } else {
                builder += `${columnName} ${typeKeywords[column.type][protocol]}`
                if (column.param) { builder += `(${column.param})` }
                if (column.isPrimary) { builder += ` PRIMARY KEY` }
                if (column.isNotNull) { builder += ` NOT NULL` }
                if (column.isUnique) { builder += ` UNIQUE` }
                if (column.isAutoIncrement) { builder += { mysql: ` AUTO_INCREMENT`, sqlite: ` AUTOINCREMENT` }[protocol] }
            }
        }
        // FOREIGN KEY(trackartist) REFERENCES artist(artistid)
        for (const columnName in columns) {
            const column = columns[columnName]
            if (!column.referenceTo) continue

            if (!isFirst) builder += ', '
            isFirst = false

            if (protocol === 'sqlite') {
                builder += `FOREIGN KEY (${columnName}) REFERENCES ${column.referenceTo.table}(${column.referenceTo.column})`
            } else {
                builder += `FOREIGN KEY (${columnName}) REFERENCES ${column.referenceTo.table}(${column.referenceTo.column})`
            }
        }
        builder += ')'
        return builder
    }

    return {
        addColumn,
        addId,
        compile,
    }
}
