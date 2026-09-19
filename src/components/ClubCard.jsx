// src/components/ClubCard.jsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import themeConfig from '../theme/themeConfig';
import Icon from './Icon';
import { bannerStyle } from '../lib/clubUtil';

export default function ClubCard({ club, joined = false }) {
  const { colors, radius } = themeConfig;
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/clubs/${club.id}`)}
      className={`text-left overflow-hidden ${colors.bgCardStrong} border ${colors.border} ${radius.lg} ${colors.borderHover} transition w-full`}
    >
      <div style={bannerStyle(club)} className="h-20 p-3 flex items-end justify-between">
        <span className={`text-[10px] font-semibold bg-black/40 text-white ${radius.full} px-2.5 py-1`}>
          {club.category}
        </span>
        {joined && (
          <span className={`text-[10px] font-bold bg-white text-black ${radius.full} px-2.5 py-1`}>Joined</span>
        )}
      </div>
      <div className="p-4">
        <h3 className={`font-bold ${colors.textWhite}`}>{club.name}</h3>
        <p className={`text-xs ${colors.textMuted} mt-1 line-clamp-2`}>{club.description}</p>
        <div className={`flex items-center gap-4 text-[11px] ${colors.textFaint} mt-3`}>
          <span className="flex items-center gap-1">
            <Icon name="group" size={13} /> {club.member_count}
          </span>
          <span className="flex items-center gap-1 truncate">
            <Icon name="location_on" size={13} /> {club.room_or_location}
          </span>
        </div>
      </div>
    </button>
  );
}
