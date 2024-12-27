import knex from "./db/knex.js";
import dotenv from 'dotenv';
import process from 'node:process';
dotenv.config();

knex.raw("SELECT 1+1 AS result")
  .then(() => {
    console.log("Database connected successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Database connection failed:", error);
    process.exit(1);
  });
