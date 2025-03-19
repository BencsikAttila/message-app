const typeKeywords = {
    'INT': { mysql: 'INT', sqlite: 'INTEGER' },
    'TEXT': { mysql: 'TEXT', sqlite: 'TEXT' },
    'BIGINT': { mysql: 'BIGINT', sqlite: 'BIGINT' },
    'VARCHAR': { mysql: 'VARCHAR', sqlite: 'VARCHAR' },
}

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
        return {
            setPrimary() { column.isPrimary = true },
            setNotNull() { column.isNotNull = true },
            setUnique() { column.isUnique = true },
            setAutoIncrement() { column.isAutoIncrement = true },
        }
    }
    const compile = (protocol) => `CREATE TABLE ${tableName} (${Object.keys(columns).map(columnName => `${columnName} ${typeKeywords[columns[columnName].type][protocol]}${columns[columnName].param ? `(${columns[columnName].param})` : ''} ${columns[columnName].isPrimary ? ' PRIMARY KEY' : ''} ${columns[columnName].isNotNull ? ' NOT NULL' : ''} ${columns[columnName].isUnique ? ' UNIQUE' : ''} ${columns[columnName].isAutoIncrement ? ' ' + { mysql: 'AUTO_INCREMENT', sqlite: 'AUTOINCREMENT' }[protocol] : ''}`).join(', ')})`
}