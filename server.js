const fs = require('fs');
const path = require('path');

const Koa = require('koa');
const app = new Koa();
const complireSfc = require('@vue/compiler-sfc');
const compiler = require('@vue/compiler-dom');

//由于浏览器请求import，路径必须带上. || ./ || ../, 所以重写import里面的uri，加上/@module，识别是node_module里面的依赖
function rewriteImport(content) {
    return content.replace(/from ['|"]([^'"]+)['|"]/g, function (s0, s1) {
        if (s1[0] === '.' || s1[0] === '/') {
            return s0;
        }
        return "from '/@module/" + s1 + "'";
    });
}

//覆盖process.env.NODE_ENV变量
function rewirteProcess(content) {
    return content.replace(/process\.env\.NODE_ENV/g, "'development'");
}

app.use(async ctx => {
    ctx.body = 'hello'
    const {request} = ctx;
    const {url} = request;
    if (url === '/') {
        ctx.type = 'text/html';
        ctx.body = fs.readFileSync('./index.html', 'utf-8');
    } else if (url.endsWith('.js')) {
        const p = path.resolve(__dirname, url.slice(1));
        const content = fs.readFileSync(p, 'utf-8');
        const ret = rewriteImport(content);
        ctx.type = 'text/javascript';
        ctx.body = ret;
    } else if (url.startsWith('/@module')) {
        //处理@module请求。
        const packageJson = path.resolve(__dirname, 'node_modules', url.replace('/@module/', ''), 'package.json');
        const jsPath = JSON.parse(fs.readFileSync(packageJson, 'utf-8')).module;
        const p = path.resolve(packageJson, '../', jsPath);
        const content = fs.readFileSync(p, 'utf-8');
        ctx.type = 'text/javascript';
        ctx.body = rewirteProcess(rewriteImport(content));
    } else if (url.indexOf('.vue') > -1) {
        //由于dist/vue.runtime.esm-bundler.js是运行时的js，不会做模版解析，所有处理vue模版渲染包含两步
        //1. 通过compiler-sfc解析sfc模版
        //2. 通过compiler-dom将template的dom解析成js可执行函数
        const p = path.resolve(__dirname, url.split('?')[0].slice(1));
        const content = fs.readFileSync(p, 'utf-8');
        const descriptor = complireSfc.parse(content).descriptor;
        let _script = descriptor.script.content;
        let _scriptContent = _script.match(/export default {([\s\S]*)}/g);
        let _scriptRet = _script.split(_scriptContent)[0] + _scriptContent[0].replace('export default ', '').replace('\n', '');
        ctx.type = 'text/javascript';
       if (!request.query.type) {
            ctx.body = `const __script = ${_scriptRet}
            import {render as __render} from "${url}?type=template"
            __script.render = __render
            export default __script`;
       } else if (request.query.type === 'template') {
            const template = descriptor.template.content;
            const render = compiler.compile(template, {mode: "module"}).code;
            ctx.body = rewriteImport(render);
       }
    }
}) 

app.listen(3001, () => {
    console.log('success listen 3001');
})