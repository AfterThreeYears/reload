var seconds = [5, 10, 30, 60, 120, 300, 600, 1800],
	noClickLiIdx = null,
	curSelected = null;  //global var
	
function $(id){
	return document.getElementById(id);
}
function $tag(tagName, context){
	return (context || document).getElementsByTagName(tagName);
}

function selectLi(id){
	$tag('a', $(id))[0].className = 'show';
	$tag('span', $(id))[0].className = 'selected';
}

function unSelectLi(id){
	$tag('a', $(id))[0].className = 'hidden';
	$tag('span', $(id))[0].className = '';
}

function send(interval, data){
	chrome.extension.sendRequest({
		cmd: 'op',
		data: data,
		interval: interval
	});
}

function getCurrentConf(){
	chrome.extension.sendRequest({
		cmd: 'getConf'
	}, function(res){
		curSelected = res;
		selectLi(curSelected.interval);
	})
}

function getOptionConf(){
	chrome.extension.sendRequest({
		cmd: 'getOption'
	}, function(res){
		$('isBgTabRun').checked = !!res.isBgTabRun;
	})
}

(function init(){
	var i18ns = document.querySelectorAll("[i18n-content]");
	for(var idx=0,el; el=i18ns[idx++];){
		el.innerHTML = chrome.i18n.getMessage(el.getAttribute('i18n-content'));	
	}
	
	seconds.forEach(function(liID, idx){
		$(liID).onclick = function(){
			send(this.id, 'start');
			var lis = document.getElementsByTagName('li');
			for(var idx=0, li; li=lis[idx++];){
				li.id == this.id ? selectLi(li.id) : unSelectLi(li.id);
			}
			window.close();
		}
		$(liID).getElementsByTagName('a')[0].onclick = function(e){
			send(liID, 'stop');
			unSelectLi(liID);
			e.stopPropagation();
		}
	});
	
	$('isBgTabRun').onchange = function(){
		chrome.extension.sendRequest({
			cmd: 'setOption',
			data: this.checked ? 1 : 0
		});
	}
	getCurrentConf();
	getOptionConf();
})();