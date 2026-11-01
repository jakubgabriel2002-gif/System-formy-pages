/*
 * SYSTEM FORMY — minimal consent gate.
 * Load this file before all analytics/advertising scripts.
 * Mark optional scripts as:
 * <script type="text/plain" data-consent="analytics" data-src="https://..."></script>
 * or use inline script text inside that same tag.
 * This does NOT discover or block unmarked scripts automatically.
 */
(function(){
  'use strict';
  var KEY='sf_cookie_consent_v1', MAX_AGE=60*60*24*180;
  function read(){try{var m=document.cookie.match(new RegExp('(?:^|; )'+KEY+'=([^;]*)'));return m?JSON.parse(decodeURIComponent(m[1])):null;}catch(e){return null;}}
  function write(value){var secure=location.protocol==='https:'?'; Secure':'';document.cookie=KEY+'='+encodeURIComponent(JSON.stringify(value))+'; Max-Age='+MAX_AGE+'; Path=/; SameSite=Lax'+secure;}
  function loadCategory(category){
    var nodes=document.querySelectorAll('script[type="text/plain"][data-consent="'+category+'"]:not([data-loaded="1"])');
    nodes.forEach(function(node){
      var s=document.createElement('script');
      Array.prototype.slice.call(node.attributes).forEach(function(a){
        if(['type','data-consent','data-src','data-loaded'].indexOf(a.name)===-1)s.setAttribute(a.name,a.value);
      });
      if(node.getAttribute('data-src'))s.src=node.getAttribute('data-src');
      if(node.textContent.trim())s.text=node.textContent;
      s.async=node.hasAttribute('async');
      node.setAttribute('data-loaded','1');
      (document.head||document.body).appendChild(s);
    });
  }
  function apply(c){if(c&&c.analytics)loadCategory('analytics');if(c&&c.marketing)loadCategory('marketing');}
  function render(){
    if(document.getElementById('sf-cookie-banner'))return;
    var b=document.createElement('section');b.id='sf-cookie-banner';b.setAttribute('role','dialog');b.setAttribute('aria-label','Ustawienia cookies');b.hidden=!!read();
    b.innerHTML='<p><strong>Twoja prywatność ma znaczenie.</strong> Używamy technologii niezbędnych do działania strony. Za Twoją zgodą możemy też włączyć analitykę i piksel reklamowy. Możesz zaakceptować wszystkie, odrzucić opcjonalne albo wybrać kategorie. <a href="/cookies">Polityka cookies</a>.</p><div id="sf-cookie-actions"><button id="sf-cookie-accept">Akceptuj wszystkie</button><button id="sf-cookie-reject">Tylko niezbędne</button><button id="sf-cookie-settings">Ustawienia</button></div>';
    document.body.appendChild(b);
    var p=document.createElement('div');p.id='sf-cookie-panel';p.hidden=true;p.innerHTML='<div role="dialog" aria-modal="true" aria-labelledby="sf-cookie-title"><h2 id="sf-cookie-title">Ustawienia cookies</h2><p>Wybierz, na co wyrażasz zgodę. Niezbędne technologie są zawsze aktywne.</p><label class="sf-cookie-row"><input type="checkbox" checked disabled> Niezbędne</label><label><input id="sf-cookie-analytics" type="checkbox"> Analityczne</label><label><input id="sf-cookie-marketing" type="checkbox"> Marketingowe (piksel reklamowy)</label><div class="sf-cookie-actions"><button class="primary" id="sf-cookie-save">Zapisz wybór</button><button id="sf-cookie-cancel">Anuluj</button></div></div>';
    document.body.appendChild(p);
    function save(c){write({necessary:true,analytics:!!c.analytics,marketing:!!c.marketing,updated:new Date().toISOString()});location.reload();}
    document.getElementById('sf-cookie-accept').onclick=function(){save({analytics:true,marketing:true});};
    document.getElementById('sf-cookie-reject').onclick=function(){save({analytics:false,marketing:false});};
    document.getElementById('sf-cookie-settings').onclick=function(){var c=read()||{};document.getElementById('sf-cookie-analytics').checked=!!c.analytics;document.getElementById('sf-cookie-marketing').checked=!!c.marketing;p.hidden=false;};
    document.getElementById('sf-cookie-cancel').onclick=function(){p.hidden=true;};
    document.getElementById('sf-cookie-save').onclick=function(){save({analytics:document.getElementById('sf-cookie-analytics').checked,marketing:document.getElementById('sf-cookie-marketing').checked});};
  }
  function ready(){var c=read();if(c)apply(c);render();document.querySelectorAll('[data-open-cookie-settings]').forEach(function(el){el.addEventListener('click',function(e){e.preventDefault();var c=read()||{};var a=document.getElementById('sf-cookie-analytics');var m=document.getElementById('sf-cookie-marketing');var p=document.getElementById('sf-cookie-panel');if(a)a.checked=!!c.analytics;if(m)m.checked=!!c.marketing;if(p)p.hidden=false;});});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
  window.SFConsent={get:read,open:function(){var p=document.getElementById('sf-cookie-panel');if(p){var c=read()||{};document.getElementById('sf-cookie-analytics').checked=!!c.analytics;document.getElementById('sf-cookie-marketing').checked=!!c.marketing;p.hidden=false;}},reset:function(){document.cookie=KEY+'=; Max-Age=0; Path=/; SameSite=Lax';location.reload();}};
})();
