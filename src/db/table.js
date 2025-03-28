const typeKeywords = {
    'INT': { mysql: 'INT', sqlite: 'INTEGER' },
    'TEXT': { mysql: 'TEXT', sqlite: 'TEXT' },
    'BIGINT': { mysql: 'BIGINT', sqlite: 'BIGINT' },
    'VARCHAR': { mysql: 'VARCHAR', sqlite: 'VARCHAR' },
}

/**
 * @typedef {{
 *   setPrimary(): ColumnBuilder
 *   setNotNull(): ColumnBuilder
 *   setUnique(): ColumnBuilder
 *   setAutoIncrement(): ColumnBuilder
 * }} ColumnBuilder
 */

/**
 * @param {string} tableName
 * @returns {{
 *   addColumn(name: string, type: 'INT' | 'TEXT' | 'BIGINT'): ColumnBuilder
 *   addColumn(name: string, type: 'VARCHAR', length: number): ColumnBuilder
 *   compile(protocol: 'sqlite' | 'mysql'): string
 * }}
 */
module.exports = function(tableName) {
    const columns = {}
    const addColumn = (name, type, param) => {
        const column = {
            type,
            param,
            isPrimary: false,
            isNotNull: false,
            isUnique: false,
            isAutoIncrement: false,
        }
        columns[name] = column
        const columnBuilder = {
            setPrimary() { column.isPrimary = true; return columnBuilder },
            setNotNull() { column.isNotNull = true; return columnBuilder },
            setUnique() { column.isUnique = true; return columnBuilder },
            setAutoIncrement() { column.isAutoIncrement = true; return columnBuilder },
        }
        return columnBuilder
    }
    const compile = (protocol) => `CREATE TABLE ${tableName} (${Object.keys(columns).map(columnName => `${columnName} ${typeKeywords[columns[columnName].type][protocol]}${columns[columnName].param ? `(${columns[columnName].param})` : ''}${columns[columnName].isPrimary ? ' PRIMARY KEY' : ''}${columns[columnName].isNotNull ? ' NOT NULL' : ''}${columns[columnName].isUnique ? ' UNIQUE' : ''}${columns[columnName].isAutoIncrement ? ' ' + { mysql: 'AUTO_INCREMENT', sqlite: 'AUTOINCREMENT' }[protocol] : ''}`).join(', ')})`

    return {
        addColumn,
        compile,
    }
}
