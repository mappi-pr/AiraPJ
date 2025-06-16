import dotenv from 'dotenv';
dotenv.config();

import { Sequelize } from 'sequelize';

const database = process.env.DB_NAME || 'your_database_name';
const username = process.env.DB_USER || 'your_username';
const password = process.env.DB_PASS || 'your_password';
const host = process.env.DB_HOST || 'localhost';
const dialect = process.env.DB_DIALECT as any || 'postgres';

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
