const dotenv = require("dotenv")
const express =require('express')
const bodyParser = require('body-parser');
const cookieParser = require("cookie-parser");
const app = express();
const cors = require('cors');

dotenv.config({path:'./config.env'})
require("./src/models/connection/conn")
const corsOptions = {
    origin: 'https://attendxpert.onrender.com',// Allow requests from this origin
    methods: ['GET', 'POST','DELETE','PUT'], // Allow only GET and POST requests
    allowedHeaders: ['Content-Type', 'Authorization'], // Allow specific headers
  };
  app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(require('./src/routes/attendanceroutes'));
const PORT = process.env.PORT || 5000;
if( process.env.NODE_ENV === "production"){
    app.use(express.static("frontend/build"));
    const path = require("path");
    app.get("*",(req,res) => {
        res.sendFile(path.resolve(__dirname,'frontend','build','index.html'))
    });
}
app.listen(PORT,()=>{
    console.log(`server is running at ${PORT}`);
})