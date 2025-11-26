'use strict';

var PopupPremierMatchmaking = (function() {

    var _Init = function() {
        var btnOk = $.GetContextPanel().FindChildrenWithClassTraverse('PopupButton')[0];
        if (btnOk) {
            btnOk.SetPanelEvent('onactivate', _OnOkPressed);
        }
    };

    var _OnOkPressed = function() {
        $.DispatchEvent('UIPopupButtonClicked', '');

        // Show the Premier accept match popup instantly
        $.Schedule(0.1, function() {
            $.DispatchEvent('PlaySoundEffect', 'popup_accept_match_found', 'MOUSE');

            UiToolkitAPI.ShowCustomLayoutPopupParameters(
                '',
                'file://{resources}/layout/popups/popup_accept_match_premier.xml',
                '',
                'none'
            );
        });
    };

    return {
        Init: _Init,
        OnOkPressed: _OnOkPressed
    };

})();

(function() {
    PopupPremierMatchmaking.Init();
})();