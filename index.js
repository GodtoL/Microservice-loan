require('dotenv').config(); // Cargar variables de entorno desde .env

const express = require("express");
const axios = require("axios");
const AWS = require("aws-sdk");

// Configurar AWS con credenciales desde .env
AWS.config.update({
    region: process.env.AWS_REGION,
    endpoint: process.env.AWS_ENDPOINT,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const app = express();
app.use(express.json());

// Configurar DynamoDB Local (ya se actualizó la configuración global)
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Configurar DynamoDB para crear la tabla si no existe
const dynamoDBService = new AWS.DynamoDB();

const createTableParams = {
    TableName: "LoanRequests",
    KeySchema: [
        { AttributeName: "id", KeyType: "HASH" }  // Clave primaria
    ],
    AttributeDefinitions: [
        { AttributeName: "id", AttributeType: "S" }  // id como String
    ],
    ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
    }
};

// Crear la tabla si no existe
dynamoDBService.listTables({}, (err, data) => {
    if (err) {
        console.error("Error al listar tablas", err);
    } else {
        if (!data.TableNames.includes("LoanRequests")) {
            dynamoDBService.createTable(createTableParams, (err, data) => {
                if (err) {
                    console.error("No se puede crear la tabla", err);
                } else {
                    console.log("Tabla creada", data);
                }
            });
        } else {
            console.log("Tabla 'LoanRequests' ya existe.");
        }
    }
});

// URL de la Lambda desde .env
const LAMBDA_URL = process.env.LAMBDA_URL;

// Endpoint para procesar préstamos
app.post("/processLoan", async (req, res) => {
    const { userType, amount, term, rate } = req.body;

    try {
        // Llamar a la Lambda
        const response = await axios.post(LAMBDA_URL, { amount, term, rate });
        console.log(response.data);
        const loanData = response.data;

        // Filtrar datos según userType
        let finalData;
        if (userType === 1) { // Cliente con cuenta
            finalData = {
                quota: loanData.quotaWithAccount,
                rate: loanData.rateWithAccount,
                term: loanData.termWithAccount
            };
        } else { // Cliente sin cuenta
            finalData = {
                quota: loanData.quota,
                rate: loanData.rate,
                term: loanData.term
            };
        }

        // Guardar en DynamoDB Local
        await dynamoDB.put({
            TableName: "LoanRequests",
            Item: {
                id: Date.now().toString(),
                userType,
                amount,
                term,
                rate,
                finalData,
                timestamp: new Date().toISOString()
            }
        }).promise();

        res.json(finalData);
    } catch (error) {
        res.status(500).json({ error: "Error al procesar la solicitud de préstamo", details: error.message });
    }
});

// Iniciar servidor
app.listen(3000, () => console.log("Microservicio corriendo en puerto 3000"));