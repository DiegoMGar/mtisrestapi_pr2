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
function validarNIF(nif){
    if(nif.length != 9 || !isLetter(nif.charAt(8)))
        return false
    else{
        var parteNumerica = ""
        for(var i=0;i<nif.length-1;i++){
            parteNumerica += nif.charAt(i)
            if(!isDigit(nif.charAt(i)))
            return false        			 
        }
        var numero = parseInt(parteNumerica)
        var letras = "TRWAGMYFPDXBNJZSQVHLCKE"
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

// GET FUNCTIONS
app.get('/',function(req,resp){
    resp.sendFile('views/form.html', {root: __dirname })
})
app.get(endPointValidarNIF,function(req,resp){
    var ok = validarNIF(req.query.nif)
    resp.send({data:{result:(ok? "true":"false")}})
})
app.get(endPointValidarIBAN,function(req,resp){
    resp.send("OK")
})
app.get(endPointConsultaCodigoPostal,function(req,resp){
    resp.send("OK")
})
app.post(endPointGenerarPresupuesto,function(req,resp){
    resp.send("OK")
})

// RUNING SERVER
app.listen(3000, function () {
    console.log('El servidor express está en el puerto 3000')
})