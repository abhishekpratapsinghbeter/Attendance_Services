const dotenv = require("dotenv")
const express =require('express')
const bodyParser = require('body-parser');
const cookieParser = require("cookie-parser");
const app = express();
const cors = require('cors');

dotenv.config({path:'./config.env'})
require("./src/models/connection/conn")
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(require('./src/routes/attendanceroutes'));
const PORT = process.env.PORT || 5000;
  
app.listen(PORT,()=>{
    console.log(`server is running at ${PORT}`);
})