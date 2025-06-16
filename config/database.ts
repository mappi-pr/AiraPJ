import { Sequelize } from 'sequelize';

const database = 'your_database_name';
const username = 'your_username';
const password = 'your_password';
const host = 'localhost';
const dialect = 'postgres';

// DB本体自動作成
const adminSequelize = new Sequelize('postgres', username, password, {
    host,
    dialect,
    logging: false,
});

async function ensureDatabase() {
    await adminSequelize.query(`CREATE DATABASE "${database}"`)
        .catch(e => {
            if (!String(e).includes('already exists')) throw e;
        });
    await adminSequelize.close();
}

const sequelize = new Sequelize(database, username, password, {
    host,
    dialect,
});

export { sequelize, ensureDatabase };