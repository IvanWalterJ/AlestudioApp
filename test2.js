const key = 'AIzaSyDyMTbei8D0RD_7Szq43zNxFkNhjLIzV4o';
fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`)
    .then(r => r.json())
    .then(j => console.log(j))
    .catch(console.error);
