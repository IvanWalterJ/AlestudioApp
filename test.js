const key = 'AIzaSyDyMTbei8D0RD_7Szq43zNxFkNhjLIzV4o';
const model = 'gemini-1.5-flash';
const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        contents: [{ parts: [{ text: "hi" }] }]
    })
}).then(r => r.json().then(j => console.log(r.status, j))).catch(console.error);
