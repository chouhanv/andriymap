var locomotive = require('locomotive')
  , Controller = locomotive.Controller;
var fs = require('fs')  
var pagesController = new Controller();

pagesController.main = function() {
  this.title = 'Interactive data map';
  this.render();
}

pagesController.getFilesInfo = function() {
	var th = this;
  var req = this.req;
  var res = this.res;
	var dir = './public/data/';
	var respData = [];
  	var files = fs.readdirSync(dir);
    for(var i in files){
    	var obj = new Object();
        if (!files.hasOwnProperty(i)) continue;
        var name = dir + files[i];
        obj.name = files[i].replace('.json',''); 
        var contents = fs.readFileSync(name, 'utf8');
        obj.data = JSON.parse(contents);
        respData.push(obj);
    }
    res.send(respData);
}

module.exports = pagesController;
