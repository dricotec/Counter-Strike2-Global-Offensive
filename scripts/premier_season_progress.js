"use strict";
var SeasonProgress;
(function (SeasonProgress) {
    const _m_nWinsForMedal = 25;

    function _Init() {
        SetRating();
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

function SetRating() {
    const elRatingEmblem = $.GetContextPanel().FindChildInLayoutFile('js-highest-rating');
    if (!elRatingEmblem) return;

    const myXuid = MyPersonaAPI.GetXuid();

    $.AsyncWebRequest('http://127.0.0.1:8080/', {
        type: 'GET',
        success: function(data) {
            try {
                const leaderboard = JSON.parse(data);
                const player = leaderboard.find(p => p.xuid === myXuid);
                if (!player) return;

                const rating = player.rating;
                const wins = player.matchesWon || 0;

                if (typeof RatingEmblem !== "undefined" && RatingEmblem.SetXuid) {
                    RatingEmblem.SetXuid({
                        root_panel: elRatingEmblem,
                        rating_type: 'Premier',
                        leaderboard_details: { score: rating },
                        do_fx: true,
                        full_details: true,
                        local_player: true
                    });
                }

                // Wash color tuff
                const elImage = elRatingEmblem.FindChildTraverse('jsPremierRatingBg');
                if (elImage) elImage.style.washColor = GetRatingColor(rating);

                const ratingLabel = elRatingEmblem.FindChildTraverse('jsRatingNumber');
                if (ratingLabel) {
                    ratingLabel.style.paddingLeft = '20px';
                    ratingLabel.style.textAlign = 'left';
                    ratingLabel.style.fontFamily = 'Stratum2';
                    ratingLabel.style.fontWeight = 'bold';
                    ratingLabel.text = rating.toString();
                }

                _SetProgressBar(rating, wins);
                _ShowHideExpirationWarning(wins, 3600);
                _SetInfoIconTooltip(wins, 3600);

            } catch (e) {
                $.Msg("[SeasonProgress] Failed to parse API data:", e);
            }
        },
        failureCallback: function(err) {
            $.Msg("[SeasonProgress] Failed to fetch leaderboard API:", err);
        }
    });
}





    function _SetProgressBar(rating, nWins) {
        const clampedRating = RatingEmblem.GetClampedRating(rating);
        const color = clampedRating;

        let nBars = nWins > 24 && nWins < 50 ? 1 :
                    nWins > 49 && nWins < 75 ? 2 :
                    nWins > 74 && nWins < 100 ? 3 :
                    nWins > 99 && nWins < 125 ? 4 :
                    nWins > 124 ? 5 : 0;
        nBars = nBars < 5 ? nBars + 1 : 5;

        const elParent = $.GetContextPanel().FindChildInLayoutFile('id-premier-season-bars');
        for (let i = 1; i <= nBars; i++) {
            let elBar = elParent.FindChild('bar-' + i);
            if (!elBar) {
                elBar = $.CreatePanel('Panel', elParent, 'bar-' + i);
                elBar.BLoadLayoutSnippet('one-bar');
            }

            const rangeOfMatchesInBar = { min: i === 1 ? 1 : ((i - 1) * _m_nWinsForMedal), max: (i * _m_nWinsForMedal) };
            const widthInnerBar = (nWins >= (rangeOfMatchesInBar.max - 1)) ? 1 : ((nWins - rangeOfMatchesInBar.min) / (_m_nWinsForMedal - 1));

            elBar.FindChildInLayoutFile('id-inner-bar').style.width = (widthInnerBar * 100) + '%';
            elBar.FindChildInLayoutFile('id-inner-bar').SwitchClass('tier', 'rank-tier-' + color);
            elBar.SwitchClass('num-bars', nBars + '-bars');
            elBar.FindChildInLayoutFile('id-inner-medal').SwitchClass('tier', nWins >= rangeOfMatchesInBar.max ? 'rank-tier-' + color : 'rank-tier-none');
        }

        $.GetContextPanel().SetDialogVariableInt('wins', nWins);
        $.GetContextPanel().SetDialogVariableInt('threshold', nBars * _m_nWinsForMedal);
    }

    function _ShowHideExpirationWarning(nWins, nTime) {
        const elParent = $.GetContextPanel().FindChildInLayoutFile('id-premier-bar-container');
        const elImages = elParent.FindChildInLayoutFile('id-premier-bar-icons');

        elParent.SetHasClass('show-warning', false);
        elImages.SetPanelEvent('onmouseover', () => {});
        elImages.SetPanelEvent('onmouseout', () => {});
    }

    function _SetInfoIconTooltip(nWins, nTime) {
        const elTooltip = $.GetContextPanel().FindChildInLayoutFile('id-season-progress-tooltip');
        let sTooltip = $.Localize('#season_progress_tooltip-body');

        if (nWins >= _m_nWinsForMedal && nTime > 0) {
            elTooltip.SetDialogVariable('time', FormatText.SecondsToSignificantTimeString(nTime));
            sTooltip += $.Localize('#season_progress_tooltip-expiration_time', elTooltip);
        }

        elTooltip.SetPanelEvent('onmouseover', () => {
            UiToolkitAPI.ShowTitleTextTooltip('id-season-progress-tooltip', '#season_progress_tooltip-title', sTooltip);
        });
        elTooltip.SetPanelEvent('onmouseout', () => UiToolkitAPI.HideTitleTextTooltip());
    }

    function ReadyForDisplay() {
        SetRating();
    }
    SeasonProgress.ReadyForDisplay = ReadyForDisplay;

    function UnReadyForDisplay() {}
    SeasonProgress.UnReadyForDisplay = UnReadyForDisplay;

    function PipRankUpdate() {
        SetRating();
    }
    SeasonProgress.PipRankUpdate = PipRankUpdate;

    // Auto-init
    {
        $.RegisterEventHandler('ReadyForDisplay', $.GetContextPanel(), SeasonProgress.ReadyForDisplay);
        $.RegisterEventHandler('UnreadyForDisplay', $.GetContextPanel(), SeasonProgress.UnReadyForDisplay);
        $.RegisterForUnhandledEvent('PanoramaComponent_MyPersona_PipRankUpdate', PipRankUpdate);
        _Init();
    }
})(SeasonProgress || (SeasonProgress = {}));
