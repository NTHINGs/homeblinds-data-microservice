// Importar las dependencias para configurar el servidor
const express = require("express");
const request = require("request");
const bodyParser = require("body-parser");

// Para futura referencia asi se jala la data del usuario
//curl -X GET "https://graph.facebook.com/<PSID>?fields=first_name,last_name,profile_pic&access_token=<PAGE_ACCESS_TOKEN>"

// Configuración MongoDB
const MongoClient = require('mongodb').MongoClient;
const uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_URL}/test?retryWrites=true&w=majority`;

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
// configurar el puerto y el mensaje en caso de exito
app.listen((process.env.PORT || 5000), () => console.log('El servidor webhook esta escuchando!'));

// Ruta de la pagina index
app.get("/", function (req, res) {
    res.send("Se ha desplegado de manera exitosa el Microservice :D!!!");
});

// Facebook Webhook

// Usados para la verificacion
app.get("/webhook", function (req, res) {
    // Verificar la coincidendia del token
    if (req.query["hub.verify_token"] === process.env.VERIFICATION_TOKEN) {
        // Mensaje de exito y envio del token requerido
        console.log("webhook verificado!");
        res.status(200).send(req.query["hub.challenge"]);
    } else {
        // Mensaje de fallo
        console.error("La verificacion ha fallado, porque los tokens no coinciden");
        res.sendStatus(403);
    }
});

// Todos eventos de mesenger sera apturados por esta ruta
app.post("/webhook", function (req, res) {
    // Verificar si el vento proviene del pagina asociada
    if (req.body.object == "page") {
        // Si existe multiples entradas entraas
        req.body.entry.forEach(function (entry) {
            // Iterara todos lo eventos capturados
            entry.messaging.forEach(function (event) {
                if (event.message) {
                    process_event(event);
                }
            });
        });
        res.sendStatus(200);
    }
});


// Funcion donde se procesara el evento
function process_event(event) {
    // Capturamos los datos del que genera el evento y el mensaje 
    const message = event.message;

    // Si en el evento existe un mensaje de tipo texto
    if (message.text) {
        // Crear un payload para almacenar el simple mensaje de texto
        const payload = {
            "text": message.text,
            "timestamp": event.timestamp,
            "sender": event.sender.id
        }
        const client = new MongoClient(uri, { useNewUrlParser: true });
        client.connect(err => {
            const collection = client.db("homeblinds-data").collection("messenger-chats");

            collection.insertMany([
                payload
            ], (err, result) => {
                console.log("Mensaje insertado en la db!");
                client.close();
            });
        });
    }
}