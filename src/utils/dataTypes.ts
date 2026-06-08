import { DatabaseType } from '@/types';

export interface DataTypeInfo {
  name: string;
  label: string;
  hasLength: boolean;
  hasPrecision: boolean;
  defaultLength?: number;
}

// MySQL 数据类型
export const mysqlDataTypes: DataTypeInfo[] = [
  { name: 'TINYINT', label: 'TINYINT', hasLength: true, hasPrecision: false, defaultLength: 4 },
  { name: 'SMALLINT', label: 'SMALLINT', hasLength: true, hasPrecision: false, defaultLength: 6 },
  { name: 'MEDIUMINT', label: 'MEDIUMINT', hasLength: true, hasPrecision: false, defaultLength: 9 },
  { name: 'INT', label: 'INT', hasLength: true, hasPrecision: false, defaultLength: 11 },
  { name: 'BIGINT', label: 'BIGINT', hasLength: true, hasPrecision: false, defaultLength: 20 },
  { name: 'FLOAT', label: 'FLOAT', hasLength: true, hasPrecision: true },
  { name: 'DOUBLE', label: 'DOUBLE', hasLength: true, hasPrecision: true },
  { name: 'DECIMAL', label: 'DECIMAL', hasLength: true, hasPrecision: true },
  { name: 'NUMERIC', label: 'NUMERIC', hasLength: true, hasPrecision: true },
  { name: 'CHAR', label: 'CHAR', hasLength: true, hasPrecision: false, defaultLength: 1 },
  { name: 'VARCHAR', label: 'VARCHAR', hasLength: true, hasPrecision: false, defaultLength: 255 },
  { name: 'BINARY', label: 'BINARY', hasLength: true, hasPrecision: false },
  { name: 'VARBINARY', label: 'VARBINARY', hasLength: true, hasPrecision: false },
  { name: 'TINYBLOB', label: 'TINYBLOB', hasLength: false, hasPrecision: false },
  { name: 'BLOB', label: 'BLOB', hasLength: false, hasPrecision: false },
  { name: 'MEDIUMBLOB', label: 'MEDIUMBLOB', hasLength: false, hasPrecision: false },
  { name: 'LONGBLOB', label: 'LONGBLOB', hasLength: false, hasPrecision: false },
  { name: 'TINYTEXT', label: 'TINYTEXT', hasLength: false, hasPrecision: false },
  { name: 'TEXT', label: 'TEXT', hasLength: false, hasPrecision: false },
  { name: 'MEDIUMTEXT', label: 'MEDIUMTEXT', hasLength: false, hasPrecision: false },
  { name: 'LONGTEXT', label: 'LONGTEXT', hasLength: false, hasPrecision: false },
  { name: 'DATE', label: 'DATE', hasLength: false, hasPrecision: false },
  { name: 'TIME', label: 'TIME', hasLength: false, hasPrecision: false },
  { name: 'DATETIME', label: 'DATETIME', hasLength: false, hasPrecision: false },
  { name: 'TIMESTAMP', label: 'TIMESTAMP', hasLength: false, hasPrecision: false },
  { name: 'YEAR', label: 'YEAR', hasLength: false, hasPrecision: false },
  { name: 'ENUM', label: 'ENUM', hasLength: false, hasPrecision: false },
  { name: 'SET', label: 'SET', hasLength: false, hasPrecision: false },
  { name: 'JSON', label: 'JSON', hasLength: false, hasPrecision: false },
  { name: 'GEOMETRY', label: 'GEOMETRY', hasLength: false, hasPrecision: false },
];

// DM 数据类型
export const dmDataTypes: DataTypeInfo[] = [
  { name: 'NUMBER', label: 'NUMBER', hasLength: true, hasPrecision: true },
  { name: 'DECIMAL', label: 'DECIMAL', hasLength: true, hasPrecision: true },
  { name: 'NUMERIC', label: 'NUMERIC', hasLength: true, hasPrecision: true },
  { name: 'INTEGER', label: 'INTEGER', hasLength: false, hasPrecision: false },
  { name: 'INT', label: 'INT', hasLength: false, hasPrecision: false },
  { name: 'BIGINT', label: 'BIGINT', hasLength: false, hasPrecision: false },
  { name: 'TINYINT', label: 'TINYINT', hasLength: false, hasPrecision: false },
  { name: 'BYTE', label: 'BYTE', hasLength: false, hasPrecision: false },
  { name: 'SMALLINT', label: 'SMALLINT', hasLength: false, hasPrecision: false },
  { name: 'FLOAT', label: 'FLOAT', hasLength: true, hasPrecision: true },
  { name: 'DOUBLE', label: 'DOUBLE', hasLength: true, hasPrecision: true },
  { name: 'REAL', label: 'REAL', hasLength: true, hasPrecision: true },
  { name: 'CHAR', label: 'CHAR', hasLength: true, hasPrecision: false, defaultLength: 1 },
  { name: 'CHARACTER', label: 'CHARACTER', hasLength: true, hasPrecision: false, defaultLength: 1 },
  { name: 'VARCHAR', label: 'VARCHAR', hasLength: true, hasPrecision: false, defaultLength: 255 },
  { name: 'VARCHAR2', label: 'VARCHAR2', hasLength: true, hasPrecision: false, defaultLength: 255 },
  { name: 'LONGVARCHAR', label: 'LONGVARCHAR', hasLength: false, hasPrecision: false },
  { name: 'CLOB', label: 'CLOB', hasLength: false, hasPrecision: false },
  { name: 'TEXT', label: 'TEXT', hasLength: false, hasPrecision: false },
  { name: 'BINARY', label: 'BINARY', hasLength: true, hasPrecision: false },
  { name: 'VARBINARY', label: 'VARBINARY', hasLength: true, hasPrecision: false },
  { name: 'BLOB', label: 'BLOB', hasLength: false, hasPrecision: false },
  { name: 'LONGVARBINARY', label: 'LONGVARBINARY', hasLength: false, hasPrecision: false },
  { name: 'IMAGE', label: 'IMAGE', hasLength: false, hasPrecision: false },
  { name: 'DATE', label: 'DATE', hasLength: false, hasPrecision: false },
  { name: 'TIME', label: 'TIME', hasLength: false, hasPrecision: false },
  { name: 'TIMESTAMP', label: 'TIMESTAMP', hasLength: false, hasPrecision: false },
  { name: 'DATETIME', label: 'DATETIME', hasLength: false, hasPrecision: false },
  { name: 'TIME WITH TIME ZONE', label: 'TIME WITH TIME ZONE', hasLength: false, hasPrecision: false },
  { name: 'TIMESTAMP WITH TIME ZONE', label: 'TIMESTAMP WITH TIME ZONE', hasLength: false, hasPrecision: false },
  { name: 'TIMESTAMP WITH LOCAL TIME ZONE', label: 'TIMESTAMP WITH LOCAL TIME ZONE', hasLength: false, hasPrecision: false },
  { name: 'INTERVAL YEAR TO MONTH', label: 'INTERVAL YEAR TO MONTH', hasLength: false, hasPrecision: false },
  { name: 'INTERVAL DAY TO SECOND', label: 'INTERVAL DAY TO SECOND', hasLength: false, hasPrecision: false },
  { name: 'BFILE', label: 'BFILE', hasLength: false, hasPrecision: false },
  { name: 'BIT', label: 'BIT', hasLength: true, hasPrecision: false },
  { name: 'VARBIT', label: 'VARBIT', hasLength: true, hasPrecision: false },
];

// MySQL -> DM 类型映射
export const mysqlToDmMap: Record<string, string> = {
  'TINYINT': 'TINYINT',
  'SMALLINT': 'SMALLINT',
  'MEDIUMINT': 'INT',
  'INT': 'INT',
  'BIGINT': 'BIGINT',
  'FLOAT': 'FLOAT',
  'DOUBLE': 'DOUBLE',
  'DECIMAL': 'DECIMAL',
  'NUMERIC': 'NUMERIC',
  'CHAR': 'CHAR',
  'VARCHAR': 'VARCHAR',
  'BINARY': 'BINARY',
  'VARBINARY': 'VARBINARY',
  'TINYBLOB': 'BLOB',
  'BLOB': 'BLOB',
  'MEDIUMBLOB': 'BLOB',
  'LONGBLOB': 'BLOB',
  'TINYTEXT': 'TEXT',
  'TEXT': 'TEXT',
  'MEDIUMTEXT': 'CLOB',
  'LONGTEXT': 'CLOB',
  'DATE': 'DATE',
  'TIME': 'TIME',
  'DATETIME': 'DATETIME',
  'TIMESTAMP': 'TIMESTAMP',
  'YEAR': 'INT',
  'ENUM': 'VARCHAR',
  'SET': 'VARCHAR',
  'JSON': 'CLOB',
  'GEOMETRY': 'BLOB',
};

// DM -> MySQL 类型映射
export const dmToMysqlMap: Record<string, string> = {
  'NUMBER': 'DECIMAL',
  'DECIMAL': 'DECIMAL',
  'NUMERIC': 'NUMERIC',
  'INTEGER': 'INT',
  'INT': 'INT',
  'BIGINT': 'BIGINT',
  'TINYINT': 'TINYINT',
  'BYTE': 'TINYINT',
  'SMALLINT': 'SMALLINT',
  'FLOAT': 'FLOAT',
  'DOUBLE': 'DOUBLE',
  'REAL': 'FLOAT',
  'CHAR': 'CHAR',
  'CHARACTER': 'CHAR',
  'VARCHAR': 'VARCHAR',
  'VARCHAR2': 'VARCHAR',
  'LONGVARCHAR': 'TEXT',
  'CLOB': 'LONGTEXT',
  'TEXT': 'TEXT',
  'BINARY': 'BINARY',
  'VARBINARY': 'VARBINARY',
  'BLOB': 'BLOB',
  'LONGVARBINARY': 'LONGBLOB',
  'IMAGE': 'LONGBLOB',
  'DATE': 'DATE',
  'TIME': 'TIME',
  'TIMESTAMP': 'TIMESTAMP',
  'DATETIME': 'DATETIME',
  'TIME WITH TIME ZONE': 'TIME',
  'TIMESTAMP WITH TIME ZONE': 'TIMESTAMP',
  'TIMESTAMP WITH LOCAL TIME ZONE': 'TIMESTAMP',
  'INTERVAL YEAR TO MONTH': 'VARCHAR',
  'INTERVAL DAY TO SECOND': 'VARCHAR',
  'BFILE': 'VARCHAR',
  'BIT': 'BINARY',
  'VARBIT': 'VARBINARY',
};

export function getDataTypes(dbType: DatabaseType): DataTypeInfo[] {
  return dbType === 'mysql' ? mysqlDataTypes : dmDataTypes;
}

export function mapDataType(dataType: string, fromDb: DatabaseType, toDb: DatabaseType): string {
  if (fromDb === toDb) return dataType;
  if (fromDb === 'mysql' && toDb === 'dm') {
    return mysqlToDmMap[dataType] || dataType;
  }
  if (fromDb === 'dm' && toDb === 'mysql') {
    return dmToMysqlMap[dataType] || dataType;
  }
  return dataType;
}

export function getDataTypeInfo(dataType: string, dbType: DatabaseType): DataTypeInfo | undefined {
  const types = getDataTypes(dbType);
  return types.find(t => t.name === dataType);
}
