import { sequelize, ensureDatabase } from '../config/database';

const connectToDatabase = async () => {
    try {
        await ensureDatabase(); // DB本体自動作成
        await sequelize.authenticate();
        console.log('Connection to the database has been established successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
};

export { sequelize, connectToDatabase };