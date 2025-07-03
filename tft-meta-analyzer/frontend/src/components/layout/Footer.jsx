import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="w-full mt-40">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 border-t border-gray-200">
        <div className="flex flex-col items-center space-y-4">
          <div className="text-center text-gray-500">
            <p className="text-sm">&copy; {new Date().getFullYear()} TFTai.gg. All Rights Reserved.</p>
            <p className="text-xs mt-2">
              TFTai.gg isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing League of Legends. League of Legends and Riot Games are trademarks or registered trademarks of Riot Games, Inc. League of Legends &copy; Riot Games, Inc.
            </p>
          </div>
          <div className="flex space-x-6 justify-center">
            <Link to="/about?section=privacy" className="text-sm text-gray-500 hover:text-gray-900 transition-colors duration-200">
              개인정보 처리방침
            </Link>
            <Link to="/about?section=terms" className="text-sm text-gray-500 hover:text-gray-900 transition-colors duration-200">
              서비스 이용약관
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
