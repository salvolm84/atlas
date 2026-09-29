import React from 'react';
import {createRoot} from 'react-dom/client';
import Atlas from '../app/atlas';
import Morphology from '../app/morfologia/page';
import {romeDate} from '../lib/sky';
import '../app/globals.css';

const morphology=document.body.dataset.page==='morphology';
createRoot(document.getElementById('root')!).render(morphology?<><a href="./index.html" style={{display:'block',padding:'16px 24px',color:'#78e5ff'}}>← Atlante Deep Sky · Modena</a><Morphology/></>:<Atlas initialDate={romeDate(new Date())} localMode/>);
