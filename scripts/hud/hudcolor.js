"use strict"; 

var HUDTeamColor = ( function ()
{
	function _Init() 
	{
    }

    function _UpdateHUD()
    {
        _SetTeamColor();
    }

    function _SetTeamColor()
    {
        var teamname = MockAdapter.GetPlayerTeamName( MockAdapter.GetLocalPlayerXuid() )
		var elRoot = $.GetContextPanel();
        while ( elRoot.GetParent() )
            elRoot = elRoot.GetParent();
        
        elRoot.SetHasClass('hud-team-ct', teamname == "CT")
        elRoot.SetHasClass('hud-team-t', teamname == "TERRORIST")
    }

	return {
		Init : _Init,
		UpdateHUD : _UpdateHUD,
	 };
})();


(function()
{
    HUDTeamColor.Init();	
    $.RegisterForUnhandledEvent( "PlayerTeamChanged", HUDTeamColor.UpdateHUD );
})();