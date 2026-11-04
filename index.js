import express from 'express';
import bodyParser from 'body-parser';
import { createReadStream, writeFileSync } from 'fs';
import crypto from 'crypto';
import http from 'http';
import mongoose from 'mongoose';
import appSrc from './app.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,OPTIONS,DELETE',
  'Access-Control-Allow-Headers': 'ngrok-skip-browser-warning,Content-Type,Accept'
};

const app = appSrc(express, bodyParser, createReadStream, crypto, http, CORS, writeFileSync, mongoose);

app.listen(process.env.PORT);
