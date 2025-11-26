'use strict';

var SettingsMenuGameSettings = ( function() {


   var _InitSteamClanTagsPanel = function () {   
        var clanTagDropdown = $('#ClanTagsEnum');
        clanTagDropdown.RemoveAllOptions();

                                       
        var id = 'clantagoption_none';
        var optionLabel = $.CreatePanel('Label', clanTagDropdown, id);
        optionLabel.text = $.Localize("#SFUI_Settings_ClanTag_None");
        optionLabel.SetAttributeString('value', 0 );
        clanTagDropdown.AddOption(optionLabel);

        var nNumClans = MyPersonaAPI.GetMyClanCount();
        for (var i = 0; i < nNumClans; i++)
        {
                                                               
            var clanID = MyPersonaAPI.GetMyClanIdByIndex(i);
            var clanTag = MyPersonaAPI.GetMyClanTagByIdCensored(clanID);

                                                                      
            var clanIDForCvar = MyPersonaAPI.GetMyClanId32BitByIndex(i);

            id = 'clantagoption' + i.toString();
            optionLabel = $.CreatePanel( 'Label', clanTagDropdown, id, { text: '{s:clanTag}' } );
            optionLabel.SetDialogVariable( 'clanTag', clanTag );
            optionLabel.SetAttributeString('value', clanIDForCvar.toString() );
            clanTagDropdown.AddOption(optionLabel);
        }

        clanTagDropdown.RefreshDisplay();
    };

	var _OnCrosshairStyleChange = function()
	{
		                                            

		let nStyle = parseInt( GameInterfaceAPI.GetSettingString( 'cl_crosshairstyle' ) );

		let bEnableControls = nStyle !== 0 && nStyle !== 1;
		$( "#XhairLength" ).visible = bEnableControls;
		$( "#XhairThickness" ).visible = bEnableControls;
		$( "#XhairGap" ).visible = bEnableControls;
		$( "#XhairOutline" ).visible = bEnableControls;
		$( "#XhairColorRed" ).visible = bEnableControls;
		$( "#XhairColorGreen" ).visible = bEnableControls;
		$( "#XhairColorBlue" ).visible = bEnableControls;
		$( "#XhairAlpha" ).visible = bEnableControls;
		$( "#XhairCenterDot" ).visible = bEnableControls;
		$( "#XhairTStyle" ).visible = bEnableControls;

		let bEnableSplitControls = nStyle === 2;
		$( "#XhairSlitDist" ).visible = bEnableSplitControls;
		$( "#XhairSplitInnerAlpha" ).visible = bEnableSplitControls;
		$( "#XhairSplitOuterAlpha" ).visible = bEnableSplitControls;
		$( "#XhairSplitRatio" ).visible = bEnableSplitControls;

		$( "#XhairFixedGap" ).visible = (nStyle === 1);

		$( "#CrosshairEditorPreview" ).SetHasClass( "dynamic-crosshair", nStyle === 0 || nStyle === 2 || nStyle === 3 );

}

	var _OnMinspecChange = function()
	{
		let minspec = parseInt( GameInterfaceAPI.GetSettingString( 'sv_competitive_minspec' ) );

		let fovMax = minspec === 0 ? 145 : 68;
		let viewmodelMax = minspec === 0 ? 10 : 2.5; // for offsets
		let recoilMax = minspec === 0 ? 10 : 1;
		let bobMax = minspec === 0 ? 10 : 30; // for vb_low
		let bobLatMax = minspec === 0 ? 10 : 2.0;
		let bobVertMax = minspec === 0 ? 10 : 2.0;
		let swayMax = minspec === 0 ? 10 : 2.5;

		$( "#v_fov" ).max = fovMax;
		$( "#v_offset_X" ).max = viewmodelMax;
		$( "#v_offset_y" ).max = viewmodelMax;
		$( "#v_offset_x" ).max = viewmodelMax; // Z
		$( "#v_recoil" ).max = recoilMax;
		$( "#vb_low" ).max = bobMax;
		$( "#vb_sh" ).max = bobLatMax;
		$( "#vb_sv" ).max = bobVertMax;
		$( "#ViewmodelSway" ).max = swayMax;
	}

    return {
        InitSteamClanTagsPanel : _InitSteamClanTagsPanel,
        OnCrosshairStyleChange : _OnCrosshairStyleChange,
        OnMinspecChange : _OnMinspecChange
    };

})();

              
(function ()
{
	SettingsMenuGameSettings.InitSteamClanTagsPanel();
	SettingsMenuGameSettings.OnCrosshairStyleChange();
	SettingsMenuGameSettings.OnMinspecChange();
	SettingsMenuShared.ChangeBackground( 0 );

})();