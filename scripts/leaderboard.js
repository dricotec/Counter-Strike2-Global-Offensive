"use strict";
/// <reference path="csgo.d.ts" />
/// <reference path="rating_emblem.ts" />
/// <reference path="common/teamcolor.ts" />
/// <reference path="honor_icon.ts" />



function getRatingClass(rating) {
    if (rating >= 30000) return 'gold';
    if (rating >= 20000) return 'red';
    if (rating >= 15000) return 'purple';
    if (rating >= 10000) return 'darkblue';
    if (rating >= 5000) return 'lightblue';
    return 'gray';
}

function GetRatingColor(rating) {
    if (rating < 10000) return "#8A8F98";
    if (rating < 15000) return "#4C89C5";
    if (rating < 20000) return "#9B5AED";
    if (rating < 25000) return "#DA5DF1";
    if (rating < 30000) return "#E84747";
    if (rating < 9999999999) return "#E7C14B";
    return "#53555aff";
}


var Leaderboard;
(function (Leaderboard) {
    function _msg(msg) {
        // Simple wrapper - keep it silent or use $.Msg for debugging
        // $.Msg(msg);
    }

    let m_bEventsRegistered = false;
    let m_myXuid = MyPersonaAPI.GetXuid();
    let m_lbType = '';
    let m_LeaderboardsDirtyEventHandler;
    let m_LeaderboardsStateChangeEventHandler;
    let m_FriendsListNameChangedEventHandler;
    let m_LobbyPlayerUpdatedEventHandler;
    let m_NameLockEventHandler;
    let m_leaderboardName = '';

    function RegisterEventHandlers() {
        _msg('RegisterEventHandlers');
        if (!m_bEventsRegistered) {
            //m_LeaderboardsDirtyEventHandler = $.RegisterForUnhandledEvent('PanoramaComponent_Leaderboards_Dirty', OnLeaderboardDirty);
            m_LeaderboardsStateChangeEventHandler = $.RegisterForUnhandledEvent('PanoramaComponent_Leaderboards_StateChange', OnLeaderboardStateChange);
            m_FriendsListNameChangedEventHandler = $.RegisterForUnhandledEvent('PanoramaComponent_FriendsList_NameChanged', _UpdateName);

            if (m_lbType === 'party') {
                m_LobbyPlayerUpdatedEventHandler = $.RegisterForUnhandledEvent("PanoramaComponent_PartyList_RebuildPartyList", _UpdatePartyList);
            }

            if (m_lbType === 'general') {
                //m_NameLockEventHandler = $.RegisterForUnhandledEvent('PanoramaComponent_MyPersona_SetPlayerLeaderboardSafeName', _UpdateNameLockButton);
            }

            m_bEventsRegistered = true;
        }
    }
    Leaderboard.RegisterEventHandlers = RegisterEventHandlers;

    function UnregisterEventHandlers() {
        _msg('UnregisterEventHandlers');
        if (m_bEventsRegistered) {
            //$.UnregisterForUnhandledEvent('PanoramaComponent_Leaderboards_Dirty', m_LeaderboardsDirtyEventHandler);
            $.UnregisterForUnhandledEvent('PanoramaComponent_Leaderboards_StateChange', m_LeaderboardsStateChangeEventHandler);
            $.UnregisterForUnhandledEvent('PanoramaComponent_FriendsList_NameChanged', m_FriendsListNameChangedEventHandler);

            if (m_lbType === 'party') {
                $.UnregisterForUnhandledEvent('PanoramaComponent_PartyList_RebuildPartyList', m_LobbyPlayerUpdatedEventHandler);
            }

            if (m_lbType === 'general') {
                //$.UnregisterForUnhandledEvent('PanoramaComponent_MyPersona_SetPlayerLeaderboardSafeName', m_NameLockEventHandler);
            }

            m_bEventsRegistered = false;
        }
    }
    Leaderboard.UnregisterEventHandlers = UnregisterEventHandlers;

    function _Init() {
        _msg('init');
        m_lbType = $.GetContextPanel().GetAttributeString('lbtype', '');
        RegisterEventHandlers();
        _SetTitle();
        _InitNavPanels();
        _UpdateLeaderboardName();

        if (m_lbType === 'party') {
            _UpdatePartyList();
            //if (LeaderboardsAPI.DoesTheLocalPlayerNeedALeaderboardSafeNameSet()) {
            //    _AutomaticLeaderboardNameLockPopup();
            //}
        }
        else if (m_lbType === 'general') {
            if (m_leaderboardName && m_leaderboardName.includes('friends')) {
                $.Schedule(1.0, UpdateLeaderboardList);
            } else {
                UpdateLeaderboardList();
            }
            $.Schedule(0.5, _UpdateNameLockButton);
        }

        _ShowGlobalRank();
    }

    function _SetHonorIcon(elPanel, xuid) {
        const honorIconOptions = {
            honor_icon_frame_panel: elPanel.FindChildTraverse('jsHonorIcon'),
            xuid: xuid,
            do_fx: true,
            xptrail_value: PartyListAPI.GetFriendXpTrailLevel(xuid),
            prime_value: PartyListAPI.GetFriendPrimeEligible(xuid)
        };
        HonorIcon.SetOptions(honorIconOptions);
    }

    function _SetTitle() {
        $.GetContextPanel().SetDialogVariable('leaderboard-title', $.Localize('#leaderboard_title_' + String(m_lbType)));
    }

    function _InitSeasonDropdown() {
        let elSeasonDropdown = $('#jsNavSeason');
        elSeasonDropdown.visible = true;
        elSeasonDropdown.RemoveAllOptions();
        // Default for Premier
        const elEntry = $.CreatePanel('Label', elSeasonDropdown, 'premier', {
            'class': ''
        });
        elEntry.SetAttributeString('leaderboard', 'premier');
        elEntry.SetAcceptsFocus(true);
        elEntry.text = 'Premier';
        elSeasonDropdown.AddOption(elEntry);
        elSeasonDropdown.SetSelected('premier');
    }

    function _InitLocationDropdown() {
        let elLocationDropdown = $('#jsNavLocation');
        elLocationDropdown.visible = true;
        elLocationDropdown.RemoveAllOptions();

        let regions = ['World', 'Friends'];
        let defaultRegion = 'Friends';

        for (let i = 0; i < regions.length; i++) {
            const szRegion = regions[i];
            const elEntry = $.CreatePanel('Label', elLocationDropdown, szRegion);
            const bCurrentRegion = _FindLocalPlayerInRegion(szRegion);

            elEntry.SetHasClass('of-interest', bCurrentRegion);
            switch (szRegion) {
                case 'World':
                    elEntry.SetAttributeString('leaderboard-class', szRegion.toLowerCase());
                    break;
                case 'Friends':
                    elEntry.SetAttributeString('friendslb', 'true');
                    elEntry.SetAttributeString('leaderboard-class', 'friends');
                    break;
                default:
                    elEntry.SetAttributeString('location-suffix', '_' + szRegion);
                    elEntry.SetAttributeString('leaderboard-class', szRegion.toLowerCase());
                    if (bCurrentRegion) {
                        defaultRegion = szRegion;
                    }
            }

            elEntry.SetAcceptsFocus(true);
            elEntry.text = $.Localize('#leaderboard_region_' + szRegion);
            elLocationDropdown.AddOption(elEntry);
        }

        if (MyPersonaAPI.GetLauncherType() === "perfectworld") {
            defaultRegion = 'friends';
        }
        elLocationDropdown.SetSelected(defaultRegion);
    }

    function _getRegionFromLeaderboardName(lbname) {
        return lbname.split('_').slice(-1)[0];
    }

    function _isLeaderboardTheFriendsLeaderboard(lbname) {
        return lbname.split('.').slice(-1)[0] === 'friends';
    }

    function _FindLocalPlayerInRegion(region) {
        // For mock Premier, always return true
        return true;
    }

    function _UpdateLeaderboardName() {
        if (m_lbType === 'general') {
            let elSeasonDropdown = $('#jsNavSeason');
            let elLocationDropdown = $('#jsNavLocation');
            let elregion = elLocationDropdown.GetSelected();
            let elSeason = elSeasonDropdown.GetSelected();
            if (elregion && elSeason) {
                if (elregion.GetAttributeString('friendslb', '') === 'true') {
                    m_leaderboardName = elSeason.GetAttributeString('leaderboard', '') + '.friends';
                }
                else {
                    m_leaderboardName = elSeason.GetAttributeString('leaderboard', '') + elregion.GetAttributeString('location-suffix', '');
                }
                $.GetContextPanel().SwitchClass('region', elregion.GetAttributeString('leaderboard-class', ''));
            }
        }
        else if (m_lbType === 'party') {
            //m_leaderboardName = LeaderboardsAPI.GetCurrentSeasonPremierLeaderboard() + '.party';
        }
        _msg(m_leaderboardName);
        return m_leaderboardName;
    }

    function _UpdateNameLockButton() {
        let elNameButton = $.GetContextPanel().FindChildTraverse('lbNameButton');
        if (!elNameButton) return;

        elNameButton.visible = true;

        // Stub values for CS:GO
        let status = '';      // no leaderboard name
        let needsName = false; // CS:GO does not require name lock

        let showButton = status !== '' || needsName;
        elNameButton.visible = showButton;
        elNameButton.SetHasClass('no-hover', status !== '');
        elNameButton.ClearPanelEvent('onactivate');

        let buttonText = '';
        if (status) {
            let name = MyPersonaAPI.GetMyLeaderboardName();
            elNameButton.SetDialogVariable('leaderboard-name', name);
            buttonText = $.Localize('#leaderboard_namelock_button_hasname', elNameButton);
            let tooltipText = '';
            switch (status) {
                case 'submitted':
                    elNameButton.SwitchClass('status', 'submitted');
                    tooltipText = $.Localize('#leaderboard_namelock_button_tooltip_submitted');
                    break;
                case 'approved':
                    elNameButton.SwitchClass('status', 'approved');
                    tooltipText = $.Localize('#leaderboard_namelock_button_tooltip_approved');
                    break;
            }
            function onMouseOver(id, tooltipText) {
                UiToolkitAPI.ShowTextTooltip(id, tooltipText);
            }
            elNameButton.SetPanelEvent('onmouseover', onMouseOver.bind(elNameButton, elNameButton.id, tooltipText));
            elNameButton.SetPanelEvent('onmouseout', () => UiToolkitAPI.HideTextTooltip());
        }
        else if (needsName) {
            buttonText = $.Localize('#leaderboard_namelock_button_needsname');
            elNameButton.SetPanelEvent('onactivate', _NameLockPopup);
        }
        elNameButton.SetDialogVariable('leaderboard_namelock_button', buttonText);
    }

    function _InitNavPanels() {
        $('#jsNavSeason').visible = false;
        $('#jsNavLocation').visible = false;
        $('#jsGoToTop').visible = m_lbType === 'general';
        if ($('#jsGoToMe')) $('#jsGoToMe').visible = m_lbType === 'general';
        if (m_lbType === 'party')
            return;
        _InitSeasonDropdown();
        _InitLocationDropdown();
    }

    function _ShowGlobalRank() {
        let showRank = $.GetContextPanel().GetAttributeString('showglobaloverride', 'true');
        $.GetContextPanel().SetHasClass('hide-global-rank', showRank === 'false');
    }

    function _UpdateGoToMeButton() {
        let btn = $.GetContextPanel().FindChildInLayoutFile('jsGoToMe');
        if (btn)
            btn.enabled = false;
    }

    function UpdateLeaderboardList() {
        _msg('-------------- UpdateLeaderboardList ' + m_leaderboardName);
        _UpdateGoToMeButton();
        let elStatus = $.GetContextPanel().FindChildInLayoutFile('id-leaderboard-loading');
        let elData = $.GetContextPanel().FindChildInLayoutFile('id-leaderboard-nodata');
        let elLeaderboardList = $.GetContextPanel().FindChildInLayoutFile('id-leaderboard-list');

        if (m_leaderboardName && (m_leaderboardName.includes('friends') || m_leaderboardName === 'premier')) {
            // Mock friends leaderboard
            elLeaderboardList.SetHasClass('hidden', false);
            elStatus.SetHasClass('hidden', true);
            elData.SetHasClass('hidden', true);
            _FillOutEntries();
        } else {
            let status = LeaderboardsAPI.GetState(m_leaderboardName);
            _msg(status + '');
            if ("none" == status) {
                elStatus.SetHasClass('hidden', false);
                elData.SetHasClass('hidden', true);
                elLeaderboardList.SetHasClass('hidden', true);
                LeaderboardsAPI.Refresh(m_leaderboardName);
                _msg('leaderboard status: requested');
            }
            else if ("loading" == status) {
                elStatus.SetHasClass('hidden', false);
                elData.SetHasClass('hidden', true);
                elLeaderboardList.SetHasClass('hidden', true);
            }
            else if ("ready" == status) {
                let count = LeaderboardsAPI.GetCount(m_leaderboardName);
                if (count === 0) {
                    elData.SetHasClass('hidden', false);
                    elStatus.SetHasClass('hidden', true);
                    elLeaderboardList.SetHasClass('hidden', true);
                }
                else {
                    elLeaderboardList.SetHasClass('hidden', false);
                    elStatus.SetHasClass('hidden', true);
                    elData.SetHasClass('hidden', true);
                    _FillOutEntries();
                }
                if (1 <= LeaderboardsAPI.HowManyMinutesAgoCached(m_leaderboardName)) {
                    LeaderboardsAPI.Refresh(m_leaderboardName);
                    _msg('leaderboard status: requested');
                }
            }
        }
    }
    Leaderboard.UpdateLeaderboardList = UpdateLeaderboardList;
    function _AddPlayer(elEntry, oPlayer, index) {
    elEntry.SetDialogVariable('player-rank', '');
    elEntry.SetDialogVariable('player-name', '');
    elEntry.SetDialogVariable('player-wins', '');
    elEntry.SetDialogVariable('player-winrate', '');
    elEntry.SetDialogVariable('player-percentile', '');
    elEntry.SetHasClass('no-hover', oPlayer === null);
    elEntry.SetHasClass('background', index % 2 === 0);

    let elAvatar = elEntry.FindChildInLayoutFile('leaderboard-entry-avatar');
    if (elAvatar) elAvatar.visible = false;

    if (oPlayer) {
        function _AddOpenPlayerCardAction(elPanel, xuid) {
            function openCard() {
                if (xuid && (xuid !== 0)) {
                    $.DispatchEvent('SidebarContextMenuActive', true);
                    let contextMenuPanel = UiToolkitAPI.ShowCustomLayoutContextMenuParametersDismissEvent(
                        '',
                        '',
                        'file://{resources}/layout/context_menus/context_menu_playercard.xml',
                        'xuid=' + xuid,
                        function() { $.DispatchEvent('SidebarContextMenuActive', false); }
                    );
                    contextMenuPanel.AddClass("ContextMenu_NoArrow");
                }
            }
            elPanel.SetPanelEvent("onactivate", openCard);
            elPanel.SetPanelEvent("oncontextmenu", openCard);
        }

        elEntry.enabled = true;

        if (m_lbType === 'party' && oPlayer.XUID) {
            if (elAvatar) {
                elAvatar.PopulateFromSteamID(oPlayer.XUID);
                elAvatar.visible = true;
            }
            _SetHonorIcon(elEntry, oPlayer.XUID);
        } else {
            if (elAvatar) elAvatar.visible = false;
        }


        

        let elRatingEmblem = elEntry.FindChildTraverse('jsRatingEmblem');
        if (m_lbType === 'party') {
            const teamColorIdx = PartyListAPI.GetPartyMemberSetting(oPlayer.XUID, 'game/teamcolor');
            const teamColorRgb = TeamColor.GetTeamColor(Number(teamColorIdx));
            if (elAvatar) elAvatar.style.border = '2px solid rgb(' + teamColorRgb + ')';
        }

        _AddOpenPlayerCardAction(elEntry, oPlayer.XUID);

        let options = {
            root_panel: elRatingEmblem,
            rating_type: 'Premier',
            presentation: 'digital',
            do_fx: true,
            leaderboard_details: oPlayer,
            full_details: false,
            local_player: oPlayer.XUID === MyPersonaAPI.GetXuid()
        };
        RatingEmblem.SetXuid(options);

        elEntry.SetDialogVariable('player-name', oPlayer.displayName || FriendsListAPI.GetFriendName(oPlayer.XUID));
        elEntry.Data().allowNameUpdates = !oPlayer.hasOwnProperty('displayName');
        elEntry.SetDialogVariable('player-wins', oPlayer.hasOwnProperty('matchesWon') ? String(oPlayer.matchesWon) : '-');

        let bHasRank = oPlayer.hasOwnProperty('rank') && oPlayer.rank > 0;
        let jsPlayerRank = elEntry.FindChildTraverse('jsPlayerRank');
        if (jsPlayerRank) jsPlayerRank.text = bHasRank ? '#' + oPlayer.rank : '-';

        let canShowWinRate = oPlayer.hasOwnProperty('matchesWon') && oPlayer.hasOwnProperty('matchesTied') && oPlayer.hasOwnProperty('matchesLost');
        if (canShowWinRate) {
            let matchesPlayed = (oPlayer.matchesWon ? oPlayer.matchesWon : 0) +
                (oPlayer.matchesTied ? oPlayer.matchesTied : 0) +
                (oPlayer.matchesLost ? oPlayer.matchesLost : 0);
            let winRate = matchesPlayed === 0 ? 0 : oPlayer.matchesWon * 100.0 / matchesPlayed;
            elEntry.SetDialogVariable('player-winrate', winRate.toFixed(2) + '%');
        } else {
            elEntry.SetDialogVariable('player-winrate', '-');
        }

        let name = oPlayer.displayName || FriendsListAPI.GetFriendName(oPlayer.XUID);
        elEntry.SetDialogVariable('player-name', name);

        // Set the rating emblem color
        let elRatingFrame = elEntry.FindChildTraverse('jsRatingEmblem');
        if (elRatingFrame) {
            let elImage = elRatingFrame.FindChildTraverse('jsPremierRatingBg');
            if (elImage) {
                let color = GetRatingColor(oPlayer.score);
                elImage.style.washColor = color;
            }
        }

        elEntry.SetDialogVariable('player-rating', oPlayer.score);
        let ratingClass = getRatingClass(oPlayer.score);
        elEntry.AddClass('rating-' + ratingClass);
        let ratingEmblem = elEntry.FindChildTraverse('jsRatingEmblem');
        if (ratingEmblem) ratingEmblem.AddClass('rating-' + ratingClass);

        // FIXED FUCKING FINALLY HOLY SHIT FUCK
        let ratingLabel = elEntry.FindChildTraverse('jsRatingNumber'); // use the ID from XML ig idk
        if (ratingLabel) {
            ratingLabel.AddClass('rating-number');
            ratingLabel.SetHasClass('rating-number', true);
            ratingLabel.style.paddingLeft = '15px';
            ratingLabel.style.textAlign = 'left';
            ratingLabel.style.fontFamily = 'Stratum2';
            ratingLabel.style.fontWeight = 'bold';
        }

        return elEntry;


    }
}


    function _UpdatePartyList() {
        if (m_lbType !== 'party') return;

        let elStatus = $.GetContextPanel().FindChildInLayoutFile('id-leaderboard-loading');
        let elData = $.GetContextPanel().FindChildInLayoutFile('id-leaderboard-nodata');
        let elLeaderboardList = $.GetContextPanel().FindChildInLayoutFile('id-leaderboard-list');

        elLeaderboardList.SetHasClass('hidden', false);
        elStatus.SetHasClass('hidden', true);
        elData.SetHasClass('hidden', true);

        function OnMouseOver(xuid) {
            $.DispatchEvent('LeaderboardHoverPlayer', xuid);
        }
        function OnMouseOut() {
            $.DispatchEvent('LeaderboardHoverPlayer', '');
        }

        let elList = $.GetContextPanel().FindChildInLayoutFile('id-leaderboard-entries');
        if (!elList) {
            $.Msg("[leaderboard.js] Missing panel: id-leaderboard-entries");
            return;
        }

        if (LobbyAPI.IsSessionActive()) {
            let members = LobbyAPI.GetSessionSettings().members;
            function GetPartyLBRow(idx) {
                let oPlayer = null;
                let machine = 'machine' + idx;
                let bValidPartyPlayer = members.hasOwnProperty(machine) && members[machine].hasOwnProperty('player0') &&
                    members[machine].player0.hasOwnProperty('xuid');
                if (!bValidPartyPlayer) return null;

                let xuid = members[machine].player0.xuid;
                oPlayer = LeaderboardsAPI.GetEntryDetailsObjectByXuid(m_leaderboardName, xuid);
                if (!oPlayer.XUID) {
                    oPlayer.XUID = xuid;
                }

                if (xuid === MyPersonaAPI.GetXuid()) {
                    oPlayer.score = 69420;
                    oPlayer.matchesWon = 25;
                    oPlayer.rank = 7;
                    oPlayer.rankWindowStats = {};
                    _msg('Local player ' + xuid + ' score=' + oPlayer.score + ' wins=' + oPlayer.matchesWon);
                } else if (PartyListAPI.GetFriendCompetitiveRankType(xuid) === "Premier") {
                    let partyScore = PartyListAPI.GetFriendCompetitiveRank(xuid);
                    let partyWins = PartyListAPI.GetFriendCompetitiveWins(xuid);
                    if (partyScore || partyWins) {
                        oPlayer.score = PartyListAPI.GetFriendCompetitiveRank(xuid);
                        oPlayer.matchesWon = PartyListAPI.GetFriendCompetitiveWins(xuid);
                        oPlayer.rankWindowStats = PartyListAPI.GetFriendCompetitivePremierWindowStatsObject(xuid);
                        _msg('PartyList player ' + xuid + ' score=' + oPlayer.score + ' wins=' + oPlayer.matchesWon + ' data={' + JSON.stringify(oPlayer) + '}');
                    }
                }
                return oPlayer;
            }

            if (elList.SetLoadListItemFunction) {
                elList.SetLoadListItemFunction((parent, nPanelIdx, reusePanel) => {
                    let oPlayer = GetPartyLBRow(nPanelIdx);

                    if (!reusePanel || !reusePanel.IsValid()) {
                        reusePanel = $.CreatePanel("Button", elList, oPlayer ? oPlayer.XUID : '');
                        reusePanel.BLoadLayoutSnippet("leaderboard-entry");
                    }

                    _AddPlayer(reusePanel, oPlayer, nPanelIdx);

                    reusePanel.SetPanelEvent('onmouseover', oPlayer ? OnMouseOver.bind(reusePanel, oPlayer.XUID) : OnMouseOut);
                    reusePanel.SetPanelEvent('onmouseout', OnMouseOut);

                    return reusePanel;
                });
                elList.UpdateListItems(PartyListAPI.GetCount());
            }
        }
    }

    function OnLeaderboardDirty(type) {
        _msg('OnLeaderboardDirty');
        if (m_leaderboardName && m_leaderboardName === type) {
            LeaderboardsAPI.Refresh(m_leaderboardName);
        }
    }

    function ReadyForDisplay() {
        _msg("ReadyForDisplay");
        RegisterEventHandlers();
        if (m_leaderboardName) {
            if (m_leaderboardName.includes('friends')) {
                $.Schedule(0.5, UpdateLeaderboardList);
            } else {
                LeaderboardsAPI.Refresh(m_leaderboardName);
            }
        }
    }
    Leaderboard.ReadyForDisplay = ReadyForDisplay;

    function UnReadyForDisplay() {
        _msg("UnReadyForDisplay");
        UnregisterEventHandlers();
    }
    Leaderboard.UnReadyForDisplay = UnReadyForDisplay;

    function _UpdateName(xuid) {
        let elList = $.GetContextPanel().FindChildInLayoutFile('id-leaderboard-entries');
        if (!elList) return;
        let elEntry = elList.FindChildInLayoutFile(xuid);
        if (elEntry && elEntry.Data().allowNameUpdates) {
            elEntry.SetDialogVariable('player-name', FriendsListAPI.GetFriendName(xuid));
        }
    }

    function _NameLockPopup() {
        UiToolkitAPI.ShowCustomLayoutPopup('', 'file://{resources}/layout/popups/popup_leaderboard_namelock.xml');
    }

    function _AutomaticLeaderboardNameLockPopup() {
        let data = $.GetContextPanel().Data();
        let bAlreadyAsked = data && data.bPromptedForLeaderboardSafeName;
        if (bAlreadyAsked) return;
        _NameLockPopup();
        data.bPromptedForLeaderboardSafeName = true;
    }

    function _FillOutEntries() {
        let elList = $.GetContextPanel().FindChildInLayoutFile('id-leaderboard-entries');
        if (!elList) {
            $.Msg("[leaderboard.js] Panel id-leaderboard-entries not found, retrying...");
            $.Schedule(0.1, _FillOutEntries);
            return;
        }

        let elLeaderboardList = $.GetContextPanel().FindChildInLayoutFile('id-leaderboard-list');
        if (elLeaderboardList) {
            elLeaderboardList.SetHasClass('hidden', false);
        }

        let elStatus = $.GetContextPanel().FindChildInLayoutFile('id-leaderboard-status');
        if (elStatus) {
            elStatus.SetHasClass('hidden', true);
        }

        let elData = $.GetContextPanel().FindChildInLayoutFile('id-leaderboard-data');
        if (elData) {
            elData.SetHasClass('hidden', true);
        }

        if (m_lbType === 'general' && m_leaderboardName === 'party') {
            // Populate with party members
            elList.RemoveAndDeleteChildren();

            if (LobbyAPI.IsSessionActive()) {
                let members = LobbyAPI.GetSessionSettings().members;
                let numPlayers = members.numPlayers;
                for (let i = 0; i < numPlayers; i++) {
                    let xuid = members['machine' + i].player0.xuid;
                    let oPlayer = {
                        XUID: xuid,
                        displayName: FriendsListAPI.GetFriendName(xuid),
                        score: 0,
                        rank: 0,
                        matchesWon: 0,
                        matchesTied: 0,
                        matchesLost: 0,
                        rank_pct: 0,
                        region: ''
                    };

                    // Fetch rating from API
                    $.AsyncWebRequest('GET', 'http://127.0.0.1:8080/', {}, function(data) {
                        try {
                            let leaderboard = JSON.parse(data);
                            let player = leaderboard.find(p => p.xuid === xuid);
                            if (player) {
                                oPlayer.score = player.rating;
                                oPlayer.rank = player.place;
                                oPlayer.rank_pct = player.rank_pct;
                                oPlayer.region = player.region;
                                oPlayer.matchesWon = Math.floor(Math.random() * 71) + 10;
                                oPlayer.matchesLost = Math.floor(Math.random() * 50);
                            }
                        } catch (e) {
                        }
                    }, function() {});

                    let elEntry = $.CreatePanel("Button", elList, String(xuid));
                    
                    _AddPlayer(elEntry, oPlayer, i);

                    $.Schedule(0.0, () => {
                        let elName = elEntry.FindChildTraverse('leaderboard-entry__name');
                        if (elName) elName.text = oPlayer.displayName;
                        let elWins = elEntry.FindChildTraverse('leaderboard-entry__wins');
                        if (elWins) elWins.text = String(oPlayer.matchesWon);
                        let elWinrate = elEntry.FindChildTraverse('leaderboard-entry__winrate');
                        if (elWinrate) elWinrate.text = oPlayer.matchesWon + oPlayer.matchesLost > 0 ? Math.floor((oPlayer.matchesWon / (oPlayer.matchesWon + oPlayer.matchesLost)) * 100) + '%' : '-';
                        elEntry.SetHasClass('local-player', xuid === m_myXuid);
                    });
                }
            }
        } else if (m_lbType === 'general' && m_leaderboardName && m_leaderboardName.includes('friends')) {
            let leaderboard = [];
            let myXuid = MyPersonaAPI.GetXuid();
            let myName = MyPersonaAPI.GetName();
            let myRating = Math.floor(Math.random() * 15001) + 10000;
            leaderboard.push({
                xuid: myXuid,
                name: myName,
                rating: myRating,
                place: 1,
                rank_pct: 95,
                region: 'EU'
            });
            let friendCount = FriendsListAPI.GetCount();
            for (let i = 0; i < friendCount; i++) {
                let xuid = FriendsListAPI.GetXuidByIndex(i);
                let name = FriendsListAPI.GetFriendName(xuid);
                let rating = Math.floor(Math.random() * 25000) + 1000; // Random rating
                let place = leaderboard.length + 1;
                let region = 'EU'; // Example
                leaderboard.push({
                    xuid: xuid,
                    name: name,
                    rating: rating,
                    place: place,
                    region: region
                });
            }
            // Sort by descending
            leaderboard.sort((a, b) => b.rating - a.rating);

            leaderboard.forEach((entry, index) => {
                entry.place = index + 1;
            });
            _PopulateLeaderboard(elList, leaderboard);
        } else {
            
        }
    }

    function _PopulateLeaderboard(elList, leaderboard) {
        if (!Array.isArray(leaderboard)) {
            $.Msg("[leaderboard.js] Invalid leaderboard data");
            return;
        }

        // Clear entries
        elList.RemoveAndDeleteChildren();

        if (m_leaderboardName.includes('friends')) {
            if (LobbyAPI.IsSessionActive()) {
                let members = LobbyAPI.GetSessionSettings().members;
                let numPlayers = members.numPlayers;
                for (let i = 0; i < numPlayers; i++) {
                    let xuid = members['machine' + i].player0.xuid;
                    let existing = leaderboard.find(p => p.xuid === xuid);
                    if (!existing) {
                        let oPlayer = {
                            xuid: xuid,
                            name: FriendsListAPI.GetFriendName(xuid),
                            rating: 0,
                            place: 0,
                            rank_pct: 0,
                            region: ''
                        };
                        $.AsyncWebRequest('GET', 'http://127.0.0.1:8080/', {}, function(data) {
                            try {
                                let lb = JSON.parse(data);
                                let p = lb.find(p => p.xuid === xuid);
                                if (p) {
                                    oPlayer.rating = p.rating;
                                    oPlayer.place = p.place;
                                    oPlayer.rank_pct = p.rank_pct;
                                    oPlayer.region = p.region;
                                }
                            } catch (e) {
                            }
                        }, function() {});
                        leaderboard.unshift(oPlayer);
                    }
                }
            }
        }
    
        leaderboard.forEach((entry, index) => {
            let matchesWon = Math.floor(Math.random() * 71) + 10;
            let matchesLost = Math.floor(Math.random() * 50);
            let winrate = Math.floor((matchesWon / (matchesWon + matchesLost)) * 100);
            let oPlayer = {
                XUID: entry.xuid,
                displayName: entry.name,
                score: entry.rating,
                rank: entry.place,
                matchesWon: matchesWon,
                matchesTied: 0,
                matchesLost: matchesLost,
                region: entry.region
            };

            let elEntry = $.CreatePanel("Button", elList, String(entry.xuid));
            elEntry.BLoadLayoutSnippet("leaderboard-entry");
            _AddPlayer(elEntry, oPlayer, index);

            $.Schedule(0.0, () => {
                let elName = elEntry.FindChildTraverse('leaderboard-entry__name');
                if (elName) elName.text = oPlayer.displayName;
                let elWins = elEntry.FindChildTraverse('leaderboard-entry__wins');
                if (elWins) elWins.text = String(oPlayer.matchesWon);
                let elWinrate = elEntry.FindChildTraverse('leaderboard-entry__winrate');
                if (elWinrate) elWinrate.text = oPlayer.matchesWon + oPlayer.matchesLost > 0 ? Math.floor((oPlayer.matchesWon / (oPlayer.matchesWon + oPlayer.matchesLost)) * 100) + '%' : '-';
                elEntry.SetHasClass('local-player', entry.xuid === m_myXuid);
            });
        });

        let highestRatingFrame = $.GetContextPanel().FindChildInLayoutFile('js-highest-rating');
        if (highestRatingFrame) {
            let userEntry = leaderboard.find(e => e.xuid === m_myXuid);
            if (userEntry) {
                RatingEmblem.SetXuid({ root_panel: highestRatingFrame, rating_type: 'Premier', leaderboard_details: { score: userEntry.rating } });

                let elImage = highestRatingFrame.FindChildTraverse('jsPremierRatingBg');
                if (elImage) {
                    let color = GetRatingColor(userEntry.rating);
                    elImage.style.washColor = color;
                }
            }
        }
    }

    function OnLeaderboardStateChange(type) {
        _msg('OnLeaderboardStateChange');
        _msg('leaderboard status: received');
        if (m_leaderboardName === type) {
            if (m_lbType === 'party') {
                _UpdatePartyList();
            }
            else if (m_lbType === 'general') {
                UpdateLeaderboardList();
            }
        }
    }
    Leaderboard.OnLeaderboardStateChange = OnLeaderboardStateChange;

    function OnLeaderboardChange() {
        _UpdateLeaderboardName();
        UpdateLeaderboardList();
    }
    Leaderboard.OnLeaderboardChange = OnLeaderboardChange;

    function GoToSelf() {
        let myIndex = LeaderboardsAPI.GetIndexByXuid(m_leaderboardName, m_myXuid);
        const elList = $.GetContextPanel().FindChildInLayoutFile('id-leaderboard-entries');
        $.DispatchEvent('ScrollToDelayLoadListItem', elList, myIndex, 'topleft', true);
    }
    Leaderboard.GoToSelf = GoToSelf;

    function GoToTop() {
        const elList = $.GetContextPanel().FindChildInLayoutFile('id-leaderboard-entries');
        $.DispatchEvent('ScrollToDelayLoadListItem', elList, 0, 'topleft', true);
    }
    Leaderboard.GoToTop = GoToTop;

    (function registerLifecycle() {
        $.RegisterEventHandler('ReadyForDisplay', $.GetContextPanel(), Leaderboard.ReadyForDisplay);
        $.RegisterEventHandler('UnreadyForDisplay', $.GetContextPanel(), Leaderboard.UnReadyForDisplay);
        _Init();
    })();

})(Leaderboard || (Leaderboard = {}));
