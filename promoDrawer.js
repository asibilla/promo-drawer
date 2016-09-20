var PromoDrawerBrandManager = function() {
	this.brand = this.findBrand();
	var locale = gidLib.getCookie('locale');
	this.market = locale.substr(3,2);
	this.language = this.findLanguage(locale);
	this.isMobile = (jQuery(window).width()<768) ? true : false;
};
PromoDrawerBrandManager.prototype = {
	constructor : PromoDrawerBrandManager,
	findBrand : function() {
		var hostname = location.hostname;
		var brand = "GP";	
		if (hostname.match(/(brfol|bananarepublicfactory)/)) {
			brand = "BF";
		}
		else if (hostname.match(/(gfol|www\.gapfactory)/)) {
			brand = "GF";
		}
		else if (hostname.match(/(onol|oldnavy)/)) {
			brand = "ON";
		}
		else if (hostname.match(/(brol|bananarepublic)/)) {
			brand = "BR";
		}
		else if (hostname.match(/(atol|athleta)/)) {
			brand = "AT";
		}
		return brand;
	},
	findLanguage : function(locale) {
		var language = "EN";
		if (locale.match(/^fr/)) {
			language = "FR";
		}
		else if (this.market=="JP") {
			language = "JA";
		}
		return language;
	}
};

var PromoDrawerLegalOverlay = function(html,isMobile) {
	this.html = html;
	this.isMobile = isMobile;
	this.isIframe = (html.match(/^(http|\/Asset_Archive|\/browse)/)) ? true : false;
	this.windowHeight = jQuery(window).height();
};
PromoDrawerLegalOverlay.prototype = {
	showOverlay : function() {
		var $this = this;
		jQuery('<div id="promoDrawer__legal-mask"></div>').appendTo('body').fadeIn();
		var popupWrapper = jQuery("<div id='promoDrawer__legal-popup-wrapper'></div>");
		if ($this.isMobile) {
			popupWrapper.addClass('mobile');
		}
		popupWrapper.append("<div id='promoDrawer__legal-popup-header'><div id='promoDrawer__legal-popup-close'>X</div></div>")
		popupWrapper.append("<div id='promoDrawer__legal-popup-inner-wrapper'><div id='promoDrawer__legal-popup-text'></div></div>");
		popupWrapper.appendTo('body');
		if (this.isIframe) {
			jQuery('#promoDrawer__legal-popup-text').addClass('iframe').append("<iframe id='pd__popup' src='" + this.html + "'></iframe>");
			jQuery('#pd__popup').on('load',function(){
				var content = jQuery(this).contents();
				content.find('body').css({'margin':'0','padding':'0'});
				if (content.find('#edfsLegalContainer').length>0) {
					content.find('#edfsLegalContainer').css({'padding':'0'});
				}
			});
		}
		else {
			jQuery('#promoDrawer__legal-popup-text').append(this.html);
		}
		jQuery('#promoDrawer__legal-popup-close,#promoDrawer__legal-mask').on('click',function() { 
        	$this.removeOverlay();
      	});
	},
	removeOverlay : function() {
		jQuery('#promoDrawer__legal-mask,#promoDrawer__legal-popup-wrapper').remove();
	}
};

//responsive image map
var PromoDrawerResonsiveImageMap = function(o,currentWidth) {
	var $this = this;
	this.imap = o;
	this.currentWidth = currentWidth;
	this.originalWidth = Number(o.attr('data-original-width'));
	this.coords = {};
	o.children('area').each(function(i,e) {
		$this.coords[i] = jQuery(e).attr('coords');
	});
};
PromoDrawerResonsiveImageMap.prototype = {
	constructor : PromoDrawerResonsiveImageMap,
	init : function() {
		var $this = this;
		setTimeout(function() { 
         	$this.setNewCoords();
        },500);
        jQuery(window).on('resize orientationchange', function() {
        	$this.setNewCoords();
        });
	},
	setNewCoords : function() {
		var $this = this;
		var ratio = this.currentWidth / this.originalWidth;
		this.imap.children('area').each(function(i,e){
			var newValues = [];
			var origValues = $this.coords[i].split(',');
			for (x=0;x<origValues.length;x++) {
				newValues[x] = Math.round(Number(origValues[x])*ratio);
			}
			var newCoordString = newValues.toString();
			jQuery(e).attr('coords',newCoordString);
		});
	}
};

//Tap to Apply
var PromoDrawerTTAObj = function(o,ppcId,promoCode) {
	this.ppcId = ppcId;
  	this.promoCode = promoCode;
  	this.clickedCookieValue = ppcId + 'TTA_Clicked';
	this.elementToClick = o;
  	this.trackId = "TTA_clicked_" + ppcId;
  	var cookieDomain = location.hostname.match(/.(gap(canada|factory)?|(app|wip)\.(px\.)?(gidapps|gidfsapps)).(com|ca|eu|co\.(uk|jp))/);
	if (cookieDomain!==null && Array.isArray(cookieDomain)) {
		this.domain = cookieDomain[0];
	}
	else {
		this.domain = ".gap.com";
	}
};
PromoDrawerTTAObj.prototype = {
	constructor : PromoDrawerTTAObj,
	init : function() {
		var $this = this;
		if (gidLib.getCookie(this.clickedCookieValue)) {
			this.setCookie();
			jQuery(document).trigger("tta:clicked",[this.ppcId,false]);
		}
		this.elementToClick.on('click',function() { 
  			if (!gidLib.getCookie($this.clickedCookieValue)) { 
    			$this.setCookie();
    			s.tl($this.elementToClick,'o',$this.trackId);
    			$this.callApi();
  			}
    		jQuery(document).trigger("tta:clicked",[$this.ppcId,true]);
		});
	},
	callApi : function() {
    	var thisDomainPost = jQuery.post("/resources/customer/promotion/applied/add/" + this.promoCode + "/" + this.ppcId);
  	},
  	setCookie : function() {
        var expire = new Date(new Date().getTime() + 1800000).toUTCString();
    	document.cookie = this.clickedCookieValue + "=true; expires=" + expire + "; path=/; domain=" + this.domain + ";";
    }
};





//promo drawer
var PromoDrawer = function(configJSON,rv,mgr) {
	this.filePath = "/Asset_Archive/GPWeb/content/promo_drawer/assets/";
	this.global = configJSON.global;
	this.promos = this.global.promos;
	this.textElements = this.global.textElements
	this.autoFire = (this.global.autoFire==true) ? true : false;
	this.isMobile = mgr.isMobile;
	var maxWidth = (this.isMobile) ? 430 : 330;
	this.cellWidth = (jQuery(window).width() * 0.75 > maxWidth) ? maxWidth : jQuery(window).width() * 0.75;
	this.bannerHeight = this.cellWidth * 332 / 600;
	this.itemHeight = 0;
	this.initResponsiveImgMapping = false;
	this.initTta = false;
	this.brand = mgr.brand;
	this.market = mgr.market;
	this.language = mgr.language;
	this.rewardsValue = rv;
};
PromoDrawer.prototype = {
	constructor : PromoDrawer,
	init : function() {
		var $this = this;
		var maskHtml = "<div id='promoDrawer__mask'></div>";
		this.drawerHtml = jQuery("<div id='promoDrawer__wrapper' data-state='closed'></div>");
		if (!this.isMobile) {
			this.drawerHtml.addClass('desktop');
		}
		else {
			this.drawerHtml.addClass('mobile');
		}
		this.drawerHtml.addClass(this.brand + " " + this.language);
		this.drawerHtml.html("\
			<div id='promoDrawer__handlebar'>\
			<div id='promoDrawer__handlebar__text'></div><div id='promoDrawer__handlebar__icon'><div>\
			</div></div></div>\
			<div id='promoDrawer__content'><div id='promoDrawer__content__items'></div></div>\
			<div id='promoDrawer__footer'></div>\
		");
		if (!this.isMobile) {
			this.textElements.subHeaderText = this.textElements.subHeaderText.replace(/tap/i,'click');
		}
		this.drawerHtml.find('#promoDrawer__handlebar__text').append("<div class='promoDrawer__title closed'>" + this.textElements.headerText + "</div>\
			<div class='promoDrawer__title open'>" + this.textElements.openHeaderOffers + "</div>\
			<div class='promoDrawer__subtitle closed'>" + this.textElements.subHeaderText + "</div>\
			<div class='promoDrawer__subtitle open'>(" + this.promos.length + " " + this.textElements.openHeaderAvailable + ")</div>\
		");
		for (i=0;i<this.promos.length;i++) {
			var bannerObj = this.createBannerObj(this.promos[i]);
			bannerObj.appendTo(this.drawerHtml.find('#promoDrawer__content__items'));
		}
		this.drawerHtml.find('.pd__htmlBanner a').on('click',function(e){
			e.preventDefault();
			var mlink = (typeof jQuery(this).attr('mlink') != 'undefined') ? jQuery(this).attr('mlink') : false;
			var aHref = jQuery(this).attr('href');
			if (mlink) {
				var queryParam = "mlink=39813,10842201," + mlink;
				var queryString = (aHref.indexOf('?')>-1) ? '&' + queryParam : '?' + queryParam;
				aHref += queryString;
			}
			location.href = aHref;
		});
		if (this.rewardsValue) {
			var rewardsHtml = "<div id='promoDrawer__footer__inner-wrapper'><div id='pd__banner'>\
				<div id='pd__rewardsBannerShadow'></div><div id='pd__rewardsBannerImg'>\
				<img id='pd__rewardsImg' src='" + this.filePath + "flag.svg' />\
				<div><span id='pd__rewardsDollar'>" + this.rewardsValue + "</span></div></div></div>\
				<div id='pd__rewardsTitle'>" + this.textElements.rewardsText + "</div>\
				<div id='pd__rewardsDetails'><a href='#myRewards'>" + this.textElements.rewardsCTA + "\
				</a></div>\
				<div style='clear:both'></div></div>\
			";
			this.drawerHtml.find('#promoDrawer__footer').append(rewardsHtml);
			this.drawerHtml.find('#promoDrawer__footer__inner-wrapper').on('click',function() { 
				location.href = "/profile/customer_value.do";
			});
		}
		if (this.drawerHtml.find('.promoDrawer__content__item').length>0) {
			if (this.drawerHtml.find('.promoDrawer__content__item').length==1) {
				this.drawerHtml.find('#promoDrawer__content__items').css({'text-align':'center'});
			}
			this.drawerHtml.prependTo('body');
			jQuery('body').prepend(maskHtml);
			if (this.initResponsiveImgMapping) {
				jQuery('.pd__responsive-imap').each(function(){
					var responsiveImap = new PromoDrawerResonsiveImageMap(jQuery(this),$this.cellWidth);
					responsiveImap.init();
				});
				jQuery('.pd__responsive-imap area').on('click',function(e){
					e.preventDefault();
					var isPopup = jQuery(this).attr('plink');
					var supressLink = false;
					var mlink = (typeof jQuery(this).attr('mlink') != 'undefined') ? jQuery(this).attr('mlink') : false;
					if (typeof isPopup != 'undefined') {
						if (isPopup=='true') {
							var href = $this.checkForEDOSOverride(jQuery(this).attr('href'));
							var legalPopup = new PromoDrawerLegalOverlay(href,$this.isMobile);
							legalPopup.showOverlay();
							supressLink = true;
							if (mlink && 's' in window) {
								s.tl(jQuery(this),'o',mlink);
							}
						}
					}
					if (!supressLink) {
						var areaHref = jQuery(this).attr('href');
						if (mlink) {
							var queryParam = "mlink=39813,10842201," + mlink;
							var queryString = (areaHref.indexOf('?')>-1) ? '&' + queryParam : '?' + queryParam;
							areaHref += queryString;
						}
						location.href = areaHref;
					}
				});
			}
			this.initializeDrawer();
		}
	},
	createBannerObj : function(o) {
		var $this = this;
		var promoItemContainer = jQuery("<div class='promoDrawer__content__item'></div>")
			.css({'width':this.cellWidth + 'px'});
		var bannerHtml = "<div class='promoDrawer__content__item__banner' style='height:" + this.bannerHeight + "px;'>";
		if (o.bannerContent.imgOrHTML == "img" ) {
			var imgMapThisItem = false;
			var imgSrc = (o.bannerContent.img.images.dataUri) ? o.bannerContent.img.images.dataUri : o.bannerContent.img.images.path;
			if (o.bannerContent.img.contentParameters.linkType) {
				imgMapThisItem = true;
				this.initResponsiveImgMapping = true;
				var mapTag = o.bannerContent.img.contentParameters.imageMap.match(/<map name=\"map_\d+\">/)[0];
				var mapName = mapTag.match(/map_\d+/)[0];
				var newMapTag = '<map name="' + mapName + '" class="pd__responsive-imap" data-original-width="600">';
				bannerHtml += o.bannerContent.img.contentParameters.imageMap.replace(mapTag,newMapTag);
			}
			bannerHtml += "<img src='" + imgSrc + "'";
			if(imgMapThisItem) {
				bannerHtml += " usemap='#" + mapName + "'";
			}
			bannerHtml += " />";
		}
		else if (!o.bannerContent.HTML.useLocal) {
			bannerHtml += '\
				<iframe frameborder="0" scrolling="no" style="height:'+ this.bannerHeight + 'px;" src="' + 
					o.bannerContent.HTML.path + '">\
				</iframe>\
			';
		}
		else {
			bannerHtml += '\
				<div class="pd__htmlBanner" style="background-color:'+ o.bannerContent.HTML.backgroundColor+';">\
					'+ o.bannerContent.HTML.localHTML +'\
				</div>\
			';
		}
		bannerHtml += "</div>";
		promoItemContainer.html(bannerHtml);
		var isTTA = false;
		var msgHtml = "<div class='promoDrawer__content__item__msg'><div class='promoDrawer__content__item__msg__left'>";
		var hideLegal = false;
		if (o.tapContent.displayType=="tap") {
			if (!this.isMobile) {
				this.textElements.tapButtonText = this.textElements.tapButtonText.replace(/tap/i,'click');
			}
			msgHtml += '\
				<div class="pd__tap-to-apply ' + o.tapContent.genericCodeId + '"><div>' + 
				this.textElements.tapButtonText + '</div></div>';
			isTTA = true;
			this.initTta = true;
		}
		else {
			if (o.tapContent.displayType=='generic') {
				var codeHtml = o.tapContent.redeemMessage.replace(/(<|{)generic(>|})/,"<span class='pd-promo-code'>" + o.tapContent.genericCode + "</span>");
			}
			else {
				if (o.tapContent.displayType=='none') {
					if (o.tapContent.popupTextLink=="") {
						hideLegal = true;
					}
				}
				var codeHtml = "<span class='pd-promo-code'>" + o.tapContent.redeemMessage + "</span>";
			}
			msgHtml += '<div class="pd__promo-code">' + codeHtml + '</div>';
		}
		msgHtml += "</div><div class='promoDrawer__content__item__msg__right'>";
		if (!hideLegal) {
			var legalOverride = false;
			msgHtml += "<div class='pd__details' data-ppc='" + o.tapContent.genericCodeId + 
				"'><a href='javascript:void(0);'>" + o.tapContent.popupTextLink + "</a></div>";
			if (o.tapContent.useLegalOverride && o.tapContent.legalOverride!="") {
				legalOverride = true;
				var legalUrl = o.tapContent.legalOverride;
			}
			else if (o.tapContent.legalOverrideUrl!="") {
				var legalUrl = o.tapContent.legalOverrideUrl;
			}
			else {
				var legalUrl = this.filePath + "legal.html?promoId=" +
				o.tapContent.genericCodeId;
			}				
		}
		msgHtml += "</div><div style='clear:both'></div></div>";
		if (isTTA) {
			msgHtml += "<div class='pd__tta-mask'><div>" + this.textElements.tapOverlay + "</div></div>";
		}
		promoItemContainer.append(msgHtml);
		if (!hideLegal) {
			promoItemContainer.find(".pd__details").on('click',function() {
				if (legalUrl=="#privacy") {
					location.href = "/customerService/info.do?cid=2331";
				}
				else {
					var legal = $this.checkForEDOSOverride(legalUrl);
					var legalPopup = new PromoDrawerLegalOverlay(legal,$this.isMobile);
					legalPopup.showOverlay();
				}
			});
		}
		if (isTTA) {
			var ttaElem = promoItemContainer.find('.pd__tap-to-apply');
			var thisTtaObj = new PromoDrawerTTAObj(ttaElem,o.tapContent.genericCodeId,o.tapContent.genericCode);
			jQuery(document).on('tta:clicked',function(e,ppcId,userClick){
				if (ppcId==o.tapContent.genericCodeId) {
					ttaElem.addClass('applied').children('div:first-child').html($this.textElements.tapButtonTextApplied);
					if (userClick) {
						var maskElem = ttaElem.closest('.promoDrawer__content__item__msg').siblings('.pd__tta-mask');
						maskElem.show();
						maskElem.css({'height':maskElem.siblings('.promoDrawer__content__item__banner').height() + 'px'});
						setTimeout(function() { 
							maskElem.hide();
						},5000);
					}
				}
			});
			thisTtaObj.init();
		}
		return promoItemContainer;
	},
	checkForEDOSOverride : function(legalUrl) {
		var $this = this;
		if (legalUrl=="#edos") {
			if ($this.brand=='ON') {
				if ($this.market.indexOf('cda')>-1) {
					if ($this.language=='EN') {
						legalUrl = '/Asset_Archive/ONWeb/content/0011/910/575/promo_drawer/edfs_popup.html';
					}
					else {
						legalUrl = '/Asset_Archive/ONWeb/content/0011/910/656/promo_drawer/edfs_popup.html';
					}
				}
				else {
					legalUrl = '/Asset_Archive/ONWeb/content/0010/776/719/assets/edfsLegal.html';
				}
			}
			else if ($this.brand=="GP") {
				if ($this.market.indexOf('cda')>-1) {
					if (this.language=="EN") {
						legalUrl = '/Asset_Archive/GPWeb/content/0005/714/255/mobile_popup.html';
					}
					else {
						legalUrl = '/Asset_Archive/GPWeb/content/0005/714/256/mobile_popup.html'
					}
				}
				else {
					legalUrl = '/Asset_Archive/GPWeb/content/0011/709/276/assets/edfsLegal.html';
				}
			}
		}
		return legalUrl;
	},
	initializeDrawer : function() {
		var $this = this;
		if (this.isMobile) {
			jQuery('.nav-shift.fixed-header_at-sm').css({'overflow-x':'hidden'});
		}
		this.promoWrapper = jQuery('#promoDrawer__wrapper');
		this.handlebar = jQuery('#promoDrawer__handlebar');
		this.directionIcon = jQuery('#promoDrawer__handlebar__icon div');
		this.mask = jQuery('#promoDrawer__mask');
		this.promoWrapper.css({'display':'block'});
		this.closedTransformValue = this.promoWrapper.outerHeight() - this.handlebar.outerHeight();
		this.transformDrawer(this.closedTransformValue,0);
		if (!this.isMobile) {
			this.addScrollArrows();
			if (this.brand=="GF" || this.brand=="ON") {
				this.appendUbarIcon();
			}
		}
		jQuery(document).trigger("promoDrawer:initialized");
		setTimeout(function(){ 
			$this.autoOpen();
		},200);
	},
	autoOpen : function() {
		var $this = this;
		function initHandlers() {
			if ($this.isMobile) {
				$this.addMobileHandlers($this.handlebar);
			}
			else {
				$this.addHandlebarClick($this.handlebar);
			}
		}
		initHandlers();
		if (!gidLib.getCookie('hasSeenPromoDrawer') && this.autoFire) {
			var timeoutDuration = 5000;
			if (this.brand=="ON" && !this.isMobile) {
				timeoutDuration = 8000;
			}
			gidLib.setCookie('hasSeenPromoDrawer','true',new Date().getTime()+ 7200000);
			$this.timeoutSet = true;
			$this.toggleBannerData(true,500,true);
			$this.closeTimeout = setTimeout(function() {
				$this.toggleBannerData(false,500,true);
				$this.timeoutSet = false;
			},timeoutDuration);
		}
		else {
			jQuery(window).load( function(){
				jQuery(document).trigger('emailPopup:ready');
			});
		}
	},
	transformDrawer : function(position,transitionTime) {
		var translateString = this.createTranslateString(position);
		this.promoWrapper.css({
			'transform' : translateString,
			'transition-duration' : transitionTime + 'ms'
		});
	},
	showMask : function() { 
		this.mask.css({
			'height':jQuery(window).height() + 500 + 'px',
		}).fadeIn();
	},
	stopBodyScroll : function() {
		jQuery('body').css({'height':jQuery(window).height() + 'px','overflow-y':'hidden'});
	},
	replaceScroll : function() {
		jQuery('body').css({'height':'auto','overflow-y':'visible'});
	},
	toggleBannerData : function(isClosed,speed,isAuto) {
		var $this = this;
		if (!isAuto) {
			if ($this.timeoutSet) {
				clearTimeout($this.closeTimeout)
			}
			$this.promoWrapper.stop(true,true);
			$this.mask.stop(true,true);
		}
		if (isClosed) {
    		$this.promoWrapper.attr('data-state','open');
    		$this.transformDrawer(0,speed);
    		var rotateValue = 'rotate(180deg)';
    		jQuery('#promoDrawer__handlebar__text div.closed').hide();
    		jQuery('#promoDrawer__handlebar__text div.open').show();
    		$this.showMask();
    		if ($this.isMobile) {
    			$this.stopBodyScroll();	
    		}
    		else if (this.brand=="GF") {
    			$this.hideUbarFlag();
    		}
    	}
    	else {
    		$this.promoWrapper.attr('data-state','closed');
    		$this.transformDrawer($this.closedTransformValue,speed);
    		var rotateValue = 'rotate(0)';
    		jQuery('#promoDrawer__handlebar__text div.open').hide()
    		jQuery('#promoDrawer__handlebar__text div.closed').show();
    		$this.mask.hide();
    		if ($this.isMobile) {
    			$this.replaceScroll();
    		}
    	}
    	$this.directionIcon.css({ 
    		'transform':rotateValue,
    		'transition-duration':'200ms',
    		'transition-timing-function':'ease-out'
    	});
	},
	//mobile functions
	addMobileHandlers : function(object) {
		var $this = this;
		jQuery('.nav-trigger,.menuListItem.gm_category').on('click',function() { 
			setTimeout(function(){ 
				if (jQuery('.nav-shift').hasClass('category-nav-is-open')) {
					jQuery('#promoDrawer__wrapper').fadeOut();
				}
				else {
					jQuery('#promoDrawer__wrapper').fadeIn();
				}
			},60);
			jQuery('.off-canvas--isolation-layer').on('touchstart',function(){ 
				jQuery('#promoDrawer__wrapper').fadeIn();
			});
		});
		if (location.pathname.indexOf('category.do')>-1) {
			function addFilterHandlers() {
				var filterHandlersAdded = false;
				jQuery('.button_cat-page-filter').on('click',function(){
					jQuery('#promoDrawer__wrapper').fadeOut();
					if (!filterHandlersAdded) {
						filterHandlersAdded = true;
						jQuery('.button_primary,.modal--close-button').on('click',function(){
							jQuery('#promoDrawer__wrapper').fadeIn();
						});
					}
				});
			}
			if (jQuery('div.universal-modal--backdrop').length>0) {
				jQuery('#promoDrawer__wrapper').hide();
			}
			if (jQuery('.button_cat-page-filter').length>0) {
				addFilterHandlers();
			}
			else {
				jQuery(document).ready(function(){
					var handlersAdded = false;
					if ('ps' in window) {
						var hasInitialized = false;
						ps.subscribe('categoryData:productsOnPage',function(){
							if (!handlersAdded) {
								handlersAdded = true;
								addFilterHandlers();
							}
						});
					}
				});
			}
		}
		if (location.pathname.match(/(product|outfit).do/)) {
			jQuery('#addToBag').on('click',function(){
				jQuery('#promoDrawer__wrapper').fadeOut();
			});
			jQuery('#modalWindow').on('click',function(){
				var mWindow = jQuery(this);
				setTimeout(function(){
					if (mWindow.attr('aria-hidden')=='true') {
						jQuery('#promoDrawer__wrapper').fadeIn();
					}
				},100);
			});
		}
		$this.addHandlebarClick(object);
    },
    //Desktop functions
    addScrollArrows : function() {
    	jQuery('#promoDrawer__content').append("<div class='pd__scrollArrow left-arrow'>\
    		<img src='/Asset_Archive/BRWeb/content/skava/promo_drawer/assets/carat-u-white.svg' /></div>\
    		<div class='pd__scrollArrow right-arrow'>\
    		<img src='/Asset_Archive/BRWeb/content/skava/promo_drawer/assets/carat-u-white.svg' /></div>\
    	");
    	this.addScrollArrowHandlers();
    },
    addScrollArrowHandlers : function() {
    	var $this = this;
    	var scrollUnit = this.cellWidth + 14;
    	var maxScroll,scrollWindowWidth;
    	var scrollWindow = jQuery('#promoDrawer__content__items');
    	var leftArrowIsHidden = true;
	    var rightArrowIsHidden = true;
    	function calcMinMax() {
    		var viewPortWidth = $this.promoWrapper.outerWidth();
    		scrollWindowWidth = $this.promoWrapper.find('#promoDrawer__content__items')[0].scrollWidth;
    		maxScroll = scrollWindowWidth - viewPortWidth;
    		if (maxScroll>0) {
    			var currentScroll = scrollWindow.scrollLeft();
    			if (currentScroll>0) {
    				jQuery('.pd__scrollArrow.left-arrow').show();
    				leftArrowIsHidden = false;
    			}
    			if (currentScroll<maxScroll) {
    				jQuery('.pd__scrollArrow.right-arrow').show();
    				rightArrowIsHidden = false;
    			}
    		}
    		else {
    			jQuery('.pd__scrollArrow').hide();
    			scrollWindow.css({'text-align':'center'});
    		}
    	}
    	calcMinMax();
    	jQuery(window).on('resize',function(){
    		calcMinMax();
    	});
    	jQuery('.pd__scrollArrow').hover(function(){
    			jQuery(this).animate({'opacity':'1'});
    		},
    		function(){
    			jQuery(this).animate({'opacity':'0.4'});
    		}
    	);
    	jQuery('.pd__scrollArrow').on('click',function(){
    		var currentScroll = scrollWindow.scrollLeft();
    		if (jQuery(this).hasClass('right-arrow')) {
    			var newSrollPos = currentScroll + scrollUnit;
    		}
    		else {
    			var newSrollPos = currentScroll - scrollUnit;
    		}
    		if (newSrollPos > maxScroll) {
    			newSrollPos = maxScroll;
    		}
    		else if (newSrollPos<0) {
    			newSrollPos = 0;
    		}
    		scrollWindow.animate({scrollLeft:newSrollPos});
    	});
    	scrollWindow.on('scroll',function(){
    		currentScroll = jQuery(this).scrollLeft();
    		if (currentScroll>0 && leftArrowIsHidden){
    			jQuery('.pd__scrollArrow.left-arrow').show();
    			leftArrowIsHidden = false;
    		}
    		else if (currentScroll==0 && !leftArrowIsHidden) {
    			jQuery('.pd__scrollArrow.left-arrow').hide();
    			leftArrowIsHidden = true;
    		}
    		else if (currentScroll<maxScroll && rightArrowIsHidden) {
    			jQuery('.pd__scrollArrow.right-arrow').show();
    			rightArrowIsHidden = false;
    		}
    		else if (currentScroll==maxScroll && !rightArrowIsHidden) {
    			jQuery('.pd__scrollArrow.right-arrow').hide();
    			rightArrowIsHidden = true;
    		}
    	});
    },
    addHandlebarClick : function(object) {
    	var $this = this;
		jQuery('#promoDrawer__mask').on('click',function() { 
			$this.toggleBannerData(false,300);
		});
		object.on('click',function(e){
			var isClosed = ($this.promoWrapper.attr('data-state')=='closed') ? true : false;
			$this.toggleBannerData(isClosed,500);
		});
		jQuery(window).on('resize',function(){
			if ($this.isMobile) {
				if (jQuery(this).width()>767) {
					$this.promoWrapper.hide();
				}
			}
			else { 
				if (jQuery(this).width()<768) {
					$this.promoWrapper.hide();
				}
				else {
					$this.promoWrapper.show();
				}
			}
		});
    },
    appendUbarIcon : function() {
    	var $this = this;
    	$this.showPdUbarFlag = (gidLib.getCookie('showPdUbarFlag')) ? false : true;
    	var iconDiv = jQuery("<div id='pd__ubar-icon' class='inline-block'></div>");
    	iconDiv.append("<div id='pd__ubar-svg'><img src='/Asset_Archive/GFWeb/content/0011/943/943/assets/ubar_icon.svg' />\
    		<div id='pd__ubar-flag'><div id='pd__ubar-flag-text'>" + this.promos.length + "</div></div></div>\
    	");
    	if ($this.showPdUbarFlag) {
    		iconDiv.find('#pd__ubar-flag').css({'display':'block'});
    	}
    	iconDiv.on('click',function(){
    		$this.toggleBannerData(true,500);
    		$this.hideUbarFlag();
    		s.tl(this,'o','PromoDrawer_UBarIcon_clicked');
    	});
    	iconDiv.hover(function(){
    			jQuery(this).find('#pd__ubar-svg img').animate({
    				'opacity':'1'
    			},100);
    		},function(){
    			jQuery(this).find('#pd__ubar-svg img').animate({
    				'opacity':'0.7'
    			},100);
    		}
    	);
    	jQuery(".favorites-nav").closest(".inline-block").not(".hide-at-lg").before(iconDiv);
    },
    hideUbarFlag : function() {
    	if (this.showPdUbarFlag) {
    		this.showPdUbarFlag = false;
    		gidLib.setCookie('showPdUbarFlag','true',new Date().getTime()+ 7200000);
    		jQuery('#pd__ubar-flag-text').fadeOut();
    		jQuery('#pd__ubar-flag').animate({
    			'width' : '0px',
    			'height' : '0px',
    			'top' : '0',
    			'right' : '0'
    		},150);
    	}
    },
    //global functions
	createTranslateString : function(value) {
		var translateString = "translate3d(0," + value + "px,0)";
		return translateString;
	}
};

function insertPromoDrawer(url,rv,mgr) {
	if (location.pathname.match(/(home|division|category|subDivision).do/) || location.pathname=="/") {
		if (gidLib.getQuerystringParam('pd_url')!="") {
			url = decodeURIComponent(gidLib.getQuerystringParam('pd_url',true));
		}
		jQuery.ajax({
			type: 'GET',
			url: url,
			jsonpCallback: 'promoObjCallback',
			dataType: 'jsonp',
			success: function(json) {
	   			var thisPromoDrawer = new PromoDrawer(json,rv,mgr);
	   			thisPromoDrawer.init();
			},
		    error: function(e) {
		       //console.log(e.message);
		    }
		});
	}
}

(function initializePromoDrawer() {
	var brandManager = new PromoDrawerBrandManager();
	if (brandManager.brand.match(/ON|GF|BF/) || brandManager.isMobile) {
		personalizationService.api.onPersonalization(function(xpmData) {
			function parseRewardsValue() {
				var rewardsValue = false;
				var pasData = personalizationService.model.personalizationData.personalizationInfoV1;
				if (location.hostname.indexOf('wip.gidapps.com')>-1) {
					rewardsValue = "123";
				}
				else {
					if (pasData.hasOwnProperty('customerAttributes') && pasData.customerAttributes.hasOwnProperty('totalRewardValue')) {
						if (pasData.customerAttributes.totalRewardValue !='' && pasData.customerAttributes.totalRewardValue!==null && pasData.customerAttributes.totalRewardValue!='0') {
							rewardsValue = pasData.customerAttributes.totalRewardValue;
						}
					}
				}
				return rewardsValue;
			}
			var rewardsValue = false;
			if (brandManager.market.match(/(US|CA)/)&&!brandManager.brand.match(/(GF|BF)/)) {
				rewardsValue = parseRewardsValue();
			}
			jQuery(document).trigger('promoDrawer:ready',[xpmData,rewardsValue,brandManager]);
		});
	}
})();

/*
<script type="text/javascript" src="/Asset_Archive/GPWeb/content/promo_drawer/promo_drawer_rev_20160919.js"></script>
<link rel="stylesheet" type="text/css" href="/Asset_Archive/GPWeb/content/promo_drawer/promo_drawer_rev_20160919.css">

<script>

	jQuery(document).on('promoDrawer:ready',function(e,xpmData,rv,mgr) {
		insertPromoDrawer("/Asset_Archive/ONWeb/content/0012/245/036/promo_drawer_config.json",rv,mgr);
	});

</script>*/

