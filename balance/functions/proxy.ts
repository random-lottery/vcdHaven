import { Handler } from '@netlify/functions';
import fetch from 'node-fetch';

const TARGET_URL = 'https://目标后端API地址.com'; // 替换为你的目标API地址

export const handler: Handler = async (event, context) => {
  const url = new URL(TARGET_URL);
  
  // 将请求路径附加到目标URL（可选，根据需求）
  url.pathname = event.path;
  url.search = event.queryStringParameters ? new URLSearchParams(event.queryStringParameters).toString() : '';

  // 构造请求选项
  const headers = new fetch.Headers(event.headers);
  // 可能需要删除一些不适用的头部
  headers.delete('host');

  const response = await fetch(url.toString(), {
    method: event.httpMethod,
    headers: headers,
    body: ['GET', 'HEAD'].includes(event.httpMethod) ? undefined : event.body,
  });

  const responseBody = await response.buffer();

  return {
    statusCode: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: responseBody.toString('base64'),
    isBase64Encoded: true,
  };
};