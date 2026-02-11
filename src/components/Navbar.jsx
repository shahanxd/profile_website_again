// import stuff
import React, { useState } from 'react';

const Navbar = ({ isCoderProfile }) => {

  // useState for animation
  const [animation, setAnimation] = useState('');

  // function for bounce animation on click
  const handleClick = () => {
    setAnimation('animate-bounce'); // set to bounce animation

    // animation time period
    setTimeout(() => {
      setAnimation('');
    }, 1000); // duration is one second
  };

  return (
    
    <div className="bg-black fixed top-0 left-0 w-full z-50 shadow-lg border-b border-b-zinc-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center py-4">
        
        {/* logo */}
        <a
          className={`text-2xl md:text-3xl lg:text-3xl font-semibold ${isCoderProfile ? 'text-orange-400' : 'text-cyan-300'} transition-colors duration-300 ${animation === 'animate-bounce' ? 'animate-custom-bounce' : ''}`}
          href="#"
          onClick={handleClick} // animation triggers on click
        >
          Sh
        </a>

        {/* links */}
        <div className="flex items-center space-x-5 text-xs lg:text-xl md:text-xl">
          <a // linkedin
            href="https://www.linkedin.com/in/shahanxd"
            target="_blank"
            rel="noopener noreferrer"
            className={`text-white ${isCoderProfile ? 'hover:text-orange-400' : 'hover:text-cyan-300'} transition-colors duration-200`}
          >
            linkedin
          </a>
          <a // github
            href="https://www.github.com/shahanxd"
            target="_blank"
            rel="noopener noreferrer"
            className={`text-white ${isCoderProfile ? 'hover:text-orange-400' : 'hover:text-cyan-300'} transition-colors duration-200`}
          >
            github
          </a>
          <a // resume
            href="https://drive.google.com/file/d/1Zuj2Xf-ikqmaKRRIzSmiIqhylULAYvub/view?usp=sharing"
            target="_blank"
            rel="noopener noreferrer"
            className={`text-white ${isCoderProfile ? 'hover:text-orange-400' : 'hover:text-cyan-300'} transition-colors duration-200`}
          >
            resume
          </a>
          <a // leetcode
            href="https://leetcode.com/u/shahanxd"
            target="_blank"
            rel="noopener noreferrer"
            className={`text-white ${isCoderProfile ? 'hover:text-orange-400' : 'hover:text-cyan-300'} transition-colors duration-200`}
          >
            leetcode
          </a>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
