var express = require('express')
var bp = require('body-parser')
var cors = require('cors')
app = express()
app.use(bp.json())
app.use(cors())
var mysql = require('mysql')
var mysqlObj = {host:'localhost',user:'mtis',password:'mtis_password',database:'mtis_pr2'}
var conn = mysql.createConnection(mysqlObj)

// ENDPOINTS
var endPointValidarNIF = '/validarNIF'
var endPointValidarIBAN = '/validarIBAN'
var endPointConsultaCodigoPostal = '/consultaCodigoPostal'
var endPointGenerarPresupuesto = '/generarPresupuesto'

// HELPERS
function validarIBAN(input) {
    var CODE_LENGTHS = {
        AD: 24, AE: 23, AT: 20, AZ: 28, BA: 20, BE: 16, BG: 22, BH: 22, BR: 29,
        CH: 21, CR: 21, CY: 28, CZ: 24, DE: 22, DK: 18, DO: 28, EE: 20, ES: 24,
        FI: 18, FO: 18, FR: 27, GB: 22, GI: 23, GL: 18, GR: 27, GT: 28, HR: 21,
        HU: 28, IE: 22, IL: 23, IS: 26, IT: 27, JO: 30, KW: 30, KZ: 20, LB: 28,
        LI: 21, LT: 20, LU: 20, LV: 21, MC: 27, MD: 24, ME: 22, MK: 19, MR: 27,
        MT: 31, MU: 30, NL: 18, NO: 15, PK: 24, PL: 28, PS: 29, PT: 25, QA: 29,
        RO: 24, RS: 22, SA: 24, SE: 24, SI: 19, SK: 24, SM: 27, TN: 24, TR: 26
    };
    var iban = String(input).toUpperCase().replace(/[^A-Z0-9]/g, ''), // keep only alphanumeric characters
            code = iban.match(/^([A-Z]{2})(\d{2})([A-Z\d]+)$/), // match and capture (1) the country code, (2) the check digits, and (3) the rest
            digits;
    // check syntax and length
    if (!code || iban.length !== CODE_LENGTHS[code[1]]) {
        return false;
    }
    // rearrange country code and check digits, and convert chars to ints
    digits = (code[3] + code[1] + code[2]).replace(/[A-Z]/g, function (letter) {
        return letter.charCodeAt(0) - 55;
    });
    // final check
    return mod97(digits);
}
function mod97(string) {
    var checksum = string.slice(0, 2), fragment;
    for (var offset = 2; offset < string.length; offset += 7) {
        fragment = String(checksum) + string.substring(offset, offset + 7);
        checksum = parseInt(fragment, 10) % 97;
    }
    return checksum;
}
function validarNIF(nif){
    if(nif.length != 9 || !isLetter(nif.charAt(8)))
        return false
    else{
        var parteNumerica = ''
        for(var i=0;i<nif.length-1;i++){
            parteNumerica += nif.charAt(i)
            if(!isDigit(nif.charAt(i)))
            return false        			 
        }
        var numero = parseInt(parteNumerica)
        var letras = 'TRWAGMYFPDXBNJZSQVHLCKE'
        if(letras.charAt(numero % 23) == nif.charAt(8).toUpperCase())
            return true
    }
    return false
}
function isLetter(str) {
    return str.length === 1 && str.match(/[a-zA-Z]/i)
}
function isDigit(str) {
    return str.length === 1 && str.match(/[0-9]/i)
}
function getCPObject(cp){
    return new Promise(function(resolve,reject){
        if(!cp.match(/^[0-9]{5}$/i)){
            resolve(false)
            return ;
        }
        var sql = 'select cp as codigoPostal,poblacion,provincia from codigospostales where cp = ?'
        var inserts = [cp]
        sql = mysql.format(sql, inserts)
        conn.query(sql,function(error,results){
            if(error){
                console.log(error)
                reject(false)
            }
            if(results.length>0){
                resolve(results[0])
            }else{
                resolve(false)
            }
        })
    })
}
function createPresupuesto(fecha, idCliente, referenciaProducto, cantidadProducto){
    return new Promise(function(resolve,reject){
        if(!fecha.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/i)){
            resolve(false)
            return ;
        }
        if(!idCliente.match(/^[0-9]+$/i)){
            resolve(false)
            return ;
        }else if(parseInt(idCliente)<1){
            resolve(false)
            return ;
        }
        if(!referenciaProducto.match(/^[0-9a-zA-Z]+$/i)){
            resolve(false)
            return ;
        }
        if(!cantidadProducto.match(/^[0-9]+$/i)){
            resolve(false)
            return ;
        }else if(parseInt(cantidadProducto)<1){
            resolve(false)
            return ;
        }
        var sql = 'insert into presupuestos values(default,?,?,?,?,default)'
        var inserts = [fecha, parseInt(idCliente), referenciaProducto, parseInt(cantidadProducto)]
        sql = mysql.format(sql, inserts)
        conn.query(sql,function(error,results){
            if(error){
                console.log(error)
                reject(true)
                return ;
            }
            resolve(results.insertId)
        })
    })
}
function checkRK(rk){
    return new Promise(function(resolve,reject){
        if(!rk.match(/^[0-9a-zA-Zñ]+$/i)){
            resolve(false)
            return ;
        }
        var sql = 'select * from restkeys where restkey = ?'
        var inserts = [rk]
        sql = mysql.format(sql, inserts)
        conn.query(sql,function(error,results){
            if(error){
                console.log(error)
                reject(true)
                return ;
            }
            if(results.length>0){
                resolve(true)
            }else{
                resolve(false)
            }
        })
    })
}

// GET FUNCTIONS
app.get('/',function(req,resp){
    resp.sendFile('views/form.html', {root: __dirname })
})
app.get(endPointValidarNIF,function(req,resp){
    var error = {status:0,msg:''}
    if(!req.query.nif || !req.query.RestKey){
        error.status=400;error.msg='Some params are missing'
        resp.status(400)
        resp.send({data:false,error:error})
        return ;
    }
    checkRK(req.query.RestKey)
    .then(function(result){
        if(!result){
            error.status=403;error.msg='No tienes permiso para ejecutar esta función'
            resp.status(403)
            resp.send({data:false,error:error})
        }else{
            var ok = validarNIF(req.query.nif)
            resp.send({data:(ok? 'true':'false')})
        }
    })
    .catch(function(err){
        error.status=500;error.msg='Server Internal Error'
        resp.status(500)
        resp.send({data:false,error:error})
    })
})
app.get(endPointValidarIBAN,function(req,resp){
    var error = {status:0,msg:''}
    if(!req.query.iban || !req.query.RestKey){
        error.status=400;error.msg='Some params are missing'
        resp.status(400)
        resp.send({data:false,error:error})
        return ;
    }
    checkRK(req.query.RestKey)
    .then(function(result){
        if(!result){
            error.status=403;error.msg='No tienes permiso para ejecutar esta función'
            resp.status(403)
            resp.send({data:false,error:error})
        }else{
            var ok = validarIBAN(req.query.iban)
            resp.send({data:(ok? 'true':'false')})
        }
    })
    .catch(function(err){
        error.status=500;error.msg='Server Internal Error'
        resp.status(500)
        resp.send({data:false,error:error})
        return ;
    })
})
app.get(endPointConsultaCodigoPostal,function(req,resp){
    var error = {status:0,msg:''}
    if(!req.query.cp || !req.query.RestKey){
        error.status=400;error.msg='Some params are missing'
        resp.status(400)
        resp.send({data:false,error:error})
        return ;
    }
    checkRK(req.query.RestKey)
    .then(function(result){
        if(!result){
            error.status=403;error.msg='No tienes permiso para ejecutar esta función'
            resp.status(403)
            resp.send({data:false,error:error})
            return new Promise((resolve,reject)=>reject(false))
        }else{
            return getCPObject(req.query.cp)
        }
    })
    .then(function(result){
        if(!result){
            error.status=404;error.msg='CP not found'
            resp.status(404)
            resp.send({data:false,error:error})
        }else{
            result.existe = true
            resp.send({data:result})
        }
    })
    .catch(function(err){
        if(err){
            error.status=500;error.msg='Server Internal Error'
            resp.status(500)
            resp.send({data:false,error:error})
        }
    })
})
app.post(endPointGenerarPresupuesto,function(req,resp){
    var error = {status:0,msg:''}
    if(!req.body.fechaPresupuesto || !req.body.idCliente || !req.body.referenciaProducto || !req.body.cantidadProducto || !req.body.RestKey){
        error.status=400;error.msg='Some params are missing'
        resp.status(400)
        resp.send({data:false,error:error})
        return ;
    }
    checkRK(req.body.RestKey)
    .then(function(result){
        if(!result){
            error.status=403;error.msg='No tienes permiso para ejecutar esta función'
            resp.status(403)
            resp.send({data:false,error:error})
            return new Promise((resolve,reject)=>reject(false))
        }else{
            return createPresupuesto(req.body.fechaPresupuesto,req.body.idCliente,req.body.referenciaProducto,req.body.cantidadProducto)
        }
    })
    .then(function(result){
        if(!result){
            error.status=400;error.msg='Some format of params are wrong'
            resp.status(400)
            resp.send({data:false,error:error})
        }else{
            result.existe = true
            resp.send({data:{idPresupuesto: result, presupuestoGenerado:true}})
        }
    })
    .catch(function(err){
        if(err){
            error.status=500;error.msg='Server Internal Error'
            resp.status(500)
            resp.send({data:false,error:error})
        }
    })
})

// RUNING SERVER
app.listen(3000, function () {
    console.log('MTIS PR2, por Diego Maroto, sirviendo por el puerto 3000')
})