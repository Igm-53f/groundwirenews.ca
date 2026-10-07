(function(){'use strict';function toggle(trigger){var panel=document.getElementById(trigger.getAttribute('aria-controls'));if(!panel){return}
var expanded=trigger.getAttribute('aria-expanded')==='true';trigger.setAttribute('aria-expanded',String(!expanded));panel.setAttribute('aria-hidden',String(expanded));panel.classList.toggle('is-open',!expanded)}
function bind(root){root.querySelectorAll('.rt-cas-tc-trigger').forEach(function(btn){if(btn.dataset.bound){return}
btn.dataset.bound='1';btn.addEventListener('click',function(){toggle(btn)})})}
document.addEventListener('DOMContentLoaded',function(){bind(document)})}())
;