(function(){'use strict';var cfg=window.RocketContact||{};var ns=cfg.ns||'rt';var i18n=cfg.i18n||{};function ready(fn){if(document.readyState!=='loading'){fn()}else{document.addEventListener('DOMContentLoaded',fn)}}
function isEmail(v){return/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}
ready(function(){var forms=document.querySelectorAll('.'+ns+'-contact-form');Array.prototype.forEach.call(forms,function(form){var started=form.querySelector('input[name="rt_started"]');function stamp(){if(started&&!started.value){started.value=String(Date.now())}}
form.addEventListener('focusin',stamp,{once:!0});form.addEventListener('pointerdown',stamp,{once:!0});form.addEventListener('submit',function(e){if(!cfg.ajaxurl){return}
var name=form.querySelector('[name="rt_name"]');var email=form.querySelector('[name="rt_email"]');var message=form.querySelector('[name="rt_message"]');var notice=form.querySelector('.'+ns+'-contact__ajax-notice');var button=form.querySelector('.'+ns+'-contact__submit');if(!name||!name.value.trim()||!email||!email.value.trim()||!message||!message.value.trim()){show(notice,i18n.required||'',!1);e.preventDefault();return}
if(!isEmail(email.value.trim())){show(notice,i18n.invalidEmail||'',!1);e.preventDefault();return}
e.preventDefault();stamp();var data=new FormData(form);data.set('action',cfg.action||'rt_contact');if(button){if(!button.dataset.original){button.dataset.original=button.textContent}
button.disabled=!0;if(button.dataset.sending){button.textContent=button.dataset.sending}}
fetch(cfg.ajaxurl,{method:'POST',body:data,credentials:'same-origin'}).then(function(r){return r.json()}).then(function(res){if(res&&res.ok){var wrap=form.parentNode;var ok=document.createElement('div');ok.className=ns+'-contact__notice '+ns+'-contact__notice--ok';ok.setAttribute('role','status');ok.textContent=res.msg||'';wrap.replaceChild(ok,form)}else{show(notice,(res&&res.msg)||i18n.error||'',!1);resetButton(button)}}).catch(function(){show(notice,i18n.error||'',!1);resetButton(button)})})})});function show(el,msg,ok){if(!el){return}
el.hidden=!1;el.textContent=msg;el.className=el.className.replace(/\s*is-(ok|err)/g,'')+(ok?' is-ok':' is-err')}
function resetButton(button){if(!button){return}
button.disabled=!1;if(button.dataset.original){button.textContent=button.dataset.original}}})()
;