const apiUrl = "http://localhost:5000"
export async function getAllDrones(){
    return new Promise((resolve,reject) => {
        fetch(`${apiUrl}/allDrones`).then(async (result) => {
            const data = await result.json()
            data.result.forEach((element,index) => {
                let temp = data.result[index]._id;
                data.result[index].id = temp;
                delete data.result[index]._id
            });
            resolve(data.result)
        })
    })
}


export async function create(body){
    return new Promise((resolve,reject) => {
        fetch(`${apiUrl}/save`,{  
            method: "post",
            body: JSON.stringify(body),
            headers: {
                'Content-Type': 'application/json',
            },
          }).then(async (result) => {
            const data = await result.json()
                let temp = data.result._id;
                data.result.id = temp;
                delete data.result._id
            resolve(data.result)
        }).catch(err => {
            reject(err)
        })
    })
}


export async function remove(id){
    return new Promise((resolve,reject) => {
        fetch(`${apiUrl}/delete/${id}`,{  
            method: "GET",
            headers: {
                'Content-Type': 'application/json',
            },
          }).then(async (result) => {
            resolve(true)
        }).catch(err => {
            reject(err)
        })
    })
}