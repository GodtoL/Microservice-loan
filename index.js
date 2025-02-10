const express = require("express");
const axios = require("axios");
const AWS = require("aws-sdk");

const app = express();
app.use(express.json());

// Configurar DynamoDB
const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: "us-east-2" });

// URL de la Lambda
const LAMBDA_URL = "https://7drmu03czb.execute-api.us-east-2.amazonaws.com/test/calculateLoan";

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

        // Guardar en DynamoDB
        // await dynamoDB.put({
        //     TableName: "LoanRequests",
        //     Item: {
        //         id: Date.now().toString(),
        //         userType,
        //         amount,
        //         term,
        //         rate,
        //         finalData,
        //         timestamp: new Date().toISOString()
        //     }
        // }).promise();

        res.json(finalData);
    } catch (error) {
        res.status(500).json({ error: "Error processing loan request", details: error.message });
    }
});

// Iniciar servidor
app.listen(3000, () => console.log("Microservice running on port 3000"));
