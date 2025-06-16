"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database = 'your_database_name';
const username = 'your_username';
const password = 'your_password';
const host = 'localhost';
const dialect = 'mysql'; // or 'postgres', 'sqlite', etc.
const sequelize = new sequelize_1.Sequelize(database, username, password, {
    host,
    dialect,
});
exports.default = sequelize;
