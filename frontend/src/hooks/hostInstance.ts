import axios from 'axios';

// PRODUCTION: https://patent-rag-596374ae2f06.herokuapp.com/api/
// DEVELOPMENT: http://127.0.0.1:8000/api/

let baseUrl: string = '';

if(import.meta.env.DEV){
  console.log('DEV');
  baseUrl = 'http://127.0.0.1:8000/api/';
} else {
  console.log('PROD');
  baseUrl = "https://patent-rag-596374ae2f06.herokuapp.com/api/";
}


const axiosInstance = axios.create({
  baseURL: baseUrl,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default axiosInstance;