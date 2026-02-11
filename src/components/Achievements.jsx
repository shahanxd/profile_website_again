// import stuff
import React, { useState, useEffect } from "react";

const Achievements = ({ isCoderProfile }) => {
  // useState for content change on profile toggle
  const [transitioning, setTransitioning] = useState(false);
  const [currentText, setCurrentText] = useState(isCoderProfile);

  // trigger transition when isCoderProfile changes
  useEffect(() => {
    setTransitioning(true);
    const timer = setTimeout(() => {
      setCurrentText(isCoderProfile);
      setTransitioning(false);
    }, 500); // transition duration 1/2 sec

    return () => clearTimeout(timer);
  }, [isCoderProfile]); // add isCoderProfile as dependency

  return (
    
    <section className="bg-black text-white md:mb-32 lg:mb-48">
      <div className="max-w-10xl mx-auto flex flex-col md:flex-row justify-around items-center space-y-12 md:space-y-0">
        
        {/* leetcode || videos */}
        <div className="text-center">
          <div
            className={`transition-all duration-500 ease-in-out ${
              transitioning ? "opacity-50 blur-sm" : "opacity-100 blur-0"
            }`}
          >
            <h2 className={`text-5xl lg:text-7xl md:text-5xl sm:text-5xl font-light transition-colors duration-200 hover:${ isCoderProfile ? "text-orange-400" : "text-cyan-300" }`}>
              {currentText ? "500+" : "250+"}
            </h2>
            <p className="mt-2 lg:text-2xl md:text-2xl sm:text-xl font-light">
              {currentText ? "questions on Leetcode" : "videos produced"}
            </p>
          </div>
        </div>

        {/* open source || clients */}
        <div className="text-center">
          <div
            className={`transition-all duration-500 ease-in-out ${
              transitioning ? "opacity-50 blur-sm" : "opacity-100 blur-0"
            }`}
          >
            <h2 className={`text-5xl lg:text-7xl md:text-5xl sm:text-5xl font-light transition-colors duration-200 hover:${ isCoderProfile ? "text-orange-400" : "text-cyan-300" }`}>
              {currentText ? "2" : "15+"}
            </h2>
            <p className="mt-2 lg:text-2xl md:text-2xl sm:text-xl font-light">
              {currentText ? "open-source contributions" : "clients served"}
            </p>
          </div>
        </div>

        {/* projects built || rating */}
        <div className="text-center">
          <div
            className={`transition-all duration-500 ease-in-out ${
              transitioning ? "opacity-50 blur-sm" : "opacity-100 blur-0"
            }`}
          >
            <h2 className={`text-5xl lg:text-7xl md:text-5xl sm:text-5xl font-light transition-colors duration-200 hover:${ isCoderProfile ? "text-orange-400" : "text-cyan-300" }`}>
              {currentText ? "5" : "5"}
            </h2>
            <p className="mt-2 lg:text-2xl md:text-2xl sm:text-xl font-light">
              {currentText ? "projects built" : "stars rated work"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Achievements;
