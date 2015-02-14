#!/usr/bin/env node

var fs=require('fs'),
    yaml=require('js-yaml'),
    preferredCurrency,
    options,
    doc,
    project,
    _=require('lodash'),
    Docx=require('docxtemplater'),
    stdio=require('stdio');

var options=stdio.getopt({
    'hours'       : {key : 'h' , description : 'Total number of billed hours'}  ,
    'generate'    : {key : 'g' , description : 'Generate a proposal'            , args : 1} ,
    'project'     : {key : 'c' , description : 'Only for one project', args            : 1},
    'generateAll' : {key : 'a' , description : 'Generate all templates'} ,
    'turnover'    : {key : 't' , description : 'Total turnover'}                ,
    'hourly'      : {key : 'y' , description : 'Print hourly instead of total'} ,
    'taxes'       : {key : 'x' , description : 'Total taxes'}                   ,
    'profit'      : {key : 'p' , description : 'Total profit'}
});

var floatRegex="(\\d+(\\.\\d{0,2})?)";

getMoneyFromAmount=function (amount) {
    var regex=new RegExp(floatRegex+" ?"+preferredCurrency);
    return parseFloat(amount.replace(regex,"$1"));
};

getHoursWorkedFromTime=function(time) {
    var regexDays  = new RegExp(floatRegex+"day");
    var regexHours = new RegExp(floatRegex+"hour");
    var days=0;
    var hours=0;

    if (regexDays.test(time))
        days = parseFloat(time.replace(regexDays,"$1"));

    if (regexHours.test(time))
        hours=parseFloat(time.replace(regexHours,"$1"));

    return hours+8*days;
};

getTurnOver=function() {
    return doc.projects.reduce(function(turnover,project){
        return turnover+getMoneyFromAmount(project.amount);
    },0);
};

getTotalTimeWorked=function() {
    return doc.projects.reduce(function(hours,project){
        return hours+getHoursWorkedFromTime(project.worked_time);
    },0);
};

getProfit=function() {
    return getTurnOver()*(1-taxes);
};

getTaxes=function() {
    return getTurnOver()*taxes;
};

convertToPdf=function(result){
    var spawnSync=require('child_process').spawnSync || require('spawn-sync');
    result.id=result.data.id;
    result.extension="docx";
    var baseDoc=getDocPath(result);
    result.extension="pdf";
    var pdfDoc=getDocPath(result);

    var command=["--headless","--convert-to","pdf","--outdir",__dirname+"/docs/",baseDoc];
    result=spawnSync("libreoffice4.2",command);

    if (result.status !== 0) {
        process.stderr.write(result.stderr);
        process.exit(result.status);
    }
    console.log(result.stdout.toString());
};

generate=function(templatePath){
      expressions= require('angular-expressions');
      // define your filter functions here, eg:
      // expressions.filters.split = function(input, str) { return input.split(str); }
      angularParser= function(tag) {
          return {
              get: tag == '.' ? function(s){ return s;} : expressions.compile(tag)
          };
      };
      //load the docx file as a binary
      content=fs
          .readFileSync(__dirname+'/'+templatePath,"binary");

      template=new Docx(content);
      template.setOptions({parser:angularParser,delimiters:{start:"[[",end:"]]"}});
      data=doc.template.en;

      if (typeof project.already_paid==="undefined")
          project.already_paid=0;

      project.total_price=0;
      project.billed.forEach(function (phase) {
          project.total_price+=phase.quantity*phase.unit_price;
      });

      project.to_pay= project.total_price-project.already_paid;


      data=_.merge(data,project);

      data.company=_.find(doc.clients,function(content,client){
          return client==project.client;
      });
      template.setData(data);
      var tags=template.getTags();
      var undefinedTags=false;
      tags.forEach(function (tag) {
          for (var i in tag.vars.undef) {
             console.log(i);
             undefinedTags=true;
          }
      });

      if (undefinedTags) {
        return console.log('some of the tags are undefined, aborting');
      }
      template.render();

      var buf=template.getZip()
        .generate({type:"nodebuffer"});


      var docName=templatePath.replace(/^[^/]+\/(\w+)\.docx/,"$1");
      var fullPath=getDocPath({docName:docName,id:data.id,extension:"docx"});
      console.log(docName+" generated in "+fullPath);
      fs.writeFileSync(fullPath,buf);
      return {docName:docName,data:data};
};

function getDocPath(options) {
    return __dirname+"/docs/"+options.docName+"_"+options.id+"."+options.extension;
}

// Get document, or throw exception on error
function main()
{
  doc=yaml.safeLoad(fs.readFileSync("clients.yml","utf8"));
  preferredCurrency=doc.currency;
  taxes=parseFloat(doc.taxes)/100;

  if (options.project) {
        project=_.find(doc.projects,function(project){
            return project.id==options.project;
        });
        if (!project) {
            return console.log('no project '+options.project+ ' found');
        }
  }
  var base=1;
  var unitSuffix="";
  var unit="";

  if (options.hourly) {
    base=1/getTotalTimeWorked();
    unitSuffix+=" / hour";
  }

  if (options.hours) {
    base*=getTotalTimeWorked();
    unit='hours';
  }

  if (options.turnover) {
    base*=getTurnOver();
    unit=preferredCurrency;
  }

  if (options.taxes) {
    base*=getTaxes();
    unit=preferredCurrency;
  }

  if (options.profit) {
    base*=getProfit();
    unit=preferredCurrency;
  }

  if (options.generate) {
      var result = generate(options.generate);
      convertToPdf(result);
  }

  if (options.generateAll) {
      var paths = fs.readdirSync('templates');
      paths.forEach(function(path){
          if (path.indexOf('.docx')==-1) return;
          console.log(path);
          var result = generate('templates/'+path);
          convertToPdf(result);
      });
  }

   base=base.toFixed(2);
   console.log(base+' '+unit+unitSuffix);
}

main();
