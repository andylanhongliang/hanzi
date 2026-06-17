/**
 * 汉字王国 - 微信小程序 CI 上传脚本
 * 
 * 使用前请先：
 * 1. 在微信公众平台 (mp.weixin.qq.com) → 开发管理 → 开发设置
 *    下载「代码上传密钥」，保存为 private.key 放在本目录
 * 2. 如启用了 IP 白名单，需加入本机 IP
 * 
 * 用法: node upload.js [版本描述]
 */
const ci = require('miniprogram-ci');
const path = require('path');

const PROJECT_PATH = path.join(__dirname, 'miniprogram');
const PRIVATE_KEY_PATH = path.join(__dirname, 'private.key');

const config = {
  appid: 'wxcc9a47f53e32f60f',
  projectPath: PROJECT_PATH,
  privateKeyPath: PRIVATE_KEY_PATH,
  ignores: ['node_modules/**/*'],
};

const version = process.argv[2] || 'v' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

(async () => {
  try {
    const project = new ci.Project(config);

    console.log(`上传中: ${version}`);
    console.log(`项目: ${config.projectPath}`);
    console.log(`AppID: ${config.appid}`);

    const uploadResult = await ci.upload({
      project,
      version,
      desc: version,
      setting: {
        es6: true,
        es7: true,
        minify: true,
        autoPrefixWXSS: true,
      },
      onProgressUpdate: (info) => {
        if (info.status === 'done') {
          console.log('上传成功');
        }
      },
    });

    console.log('上传完成！请在微信公众平台 → 版本管理 中提交审核');
  } catch (err) {
    console.error('上传失败: ' + err.message);
    process.exit(1);
  }
})();
