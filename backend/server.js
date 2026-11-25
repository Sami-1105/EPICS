import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import Record from './models/Record.js';
import { calculateRisk } from './utils/risk.js';
import { installIntegrations } from './integrations.js';

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;
const dataPath = path.join(__dirname, 'data/betwa-demo.json');
const seed = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
let dbReady = false;
app.use(cors({origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173'}));
app.use(express.json({limit:'10mb'}));
app.use('/uploads', express.static(path.join(__dirname,'uploads')));

mongoose.connect(process.env.MONGO_URI || '', {serverSelectionTimeoutMS:2500})
 .then(()=>{dbReady=true; console.log('MongoDB connected');})
 .catch(()=>console.log('MongoDB not configured/available; using bundled demo data.'));

async function getRecords(kind) {
 const rows = !dbReady ? (seed[kind] || []) : (await Record.find({kind}).sort({createdAt:1}).lean()).map(x=>x.payload);
 return [...rows].sort((a,b)=>new Date(a.date || a.lastUpdated || a.createdAt || 0)-new Date(b.date || b.lastUpdated || b.createdAt || 0));
}
async function saveRecord(kind,payload) {
 if (dbReady) await Record.create({kind,payload});
 else (seed[kind] ||= []).push(payload);
 return payload;
}
app.get('/api/health',(req,res)=>res.json({ok:true,database:dbReady?'mongodb':'demo-memory',dataMode:'DEMO SAMPLE DATA unless explicitly connected to verified feeds'}));
app.get('/api/overview',async(req,res)=>{
 const [river,rainfall,areas,shelters,alerts,assessments]=await Promise.all(['river','rainfall','areas','shelters','alerts','assessments'].map(getRecords));
 const hasCwc = [...river,...rainfall].some(x=>String(x.source||'').includes('Central Water Commission'));
 res.json({river,rainfall,areas,shelters,alerts,assessments,risk:calculateRisk(river,rainfall),dataMode:hasCwc?'CWC IMPORTED DATA + DEMO/OTHER RECORDS':'DEMO SAMPLE DATA'});
});
app.get('/api/river',async(req,res)=>res.json(await getRecords('river')));
app.get('/api/rainfall',async(req,res)=>res.json(await getRecords('rainfall')));
app.get('/api/flood-risk',async(req,res)=>{res.json(calculateRisk(await getRecords('river'),await getRecords('rainfall')));});
app.get('/api/areas',async(req,res)=>res.json(await getRecords('areas')));
app.get('/api/alerts',async(req,res)=>res.json(await getRecords('alerts')));

installIntegrations(app, { getRecords, saveRecord, isDbReady: () => dbReady });

app.post('/api/reports',async(req,res)=>{
 const {name,location,description,lat,lng}=req.body;
 if(!description) return res.status(400).json({error:'Description is required'});
 const report={id:crypto.randomUUID(),name:name||'Anonymous',location:location||'Betwa region',description,lat:Number(lat)||null,lng:Number(lng)||null,status:'Received',createdAt:new Date().toISOString()};
 await saveRecord('reports',report);
 res.status(201).json(report);
});
app.post('/api/sos',async(req,res)=>{
 const {name,phone,lat,lng,message}=req.body;
 const alert={id:crypto.randomUUID(),title:'SOS request (demo)',message:`${name||'User'} requested assistance. ${message||''}`,severity:'critical',phone:phone||'',lat:Number(lat)||null,lng:Number(lng)||null,createdAt:new Date().toISOString()};
 await saveRecord('alerts',alert);
 res.status(201).json({message:'SOS recorded in this demo system. It has NOT been sent to emergency services.',alert});
});

const upload=multer({dest:path.join(__dirname,'uploads'),limits:{fileSize:12*1024*1024},fileFilter:(req,file,cb)=>{
 const ok=['image/jpeg','image/png','image/webp'].includes(file.mimetype);
 cb(ok?null:new Error('Only JPG, PNG or WEBP images are allowed'),ok);
}});

app.post('/api/auth/register',(req,res)=>{
 const {name,email,password}=req.body;
 if(!name||!email||!password||password.length<4) return res.status(400).json({error:'Name, email and password (4+ characters) are required'});
 res.status(201).json({token:'demo-token',user:{name,email,role:'citizen'},warning:'Demo authentication only; configure secure persistent auth before deployment.'});
});
app.post('/api/auth/login',(req,res)=>{
 const {email,password}=req.body;
 if(!email||!password||password.length<4) return res.status(400).json({error:'Enter email and password (4+ characters)'});
 res.json({token:'demo-token',user:{name:email.split('@')[0],email,role:'citizen'},warning:'Demo authentication only; no password verification is performed.'});
});
app.use((err,req,res,next)=>res.status(400).json({error:err.message||'Request failed'}));
app.listen(PORT,()=>console.log(`CLARKE API running at http://localhost:${PORT}`));
