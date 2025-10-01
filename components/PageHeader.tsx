import React from 'react';

// PERMANENT FIX: Refactored from interface to type to avoid "reserved word" syntax error.
type PageHeaderProps = {
  title: string;
  description: string;
}

const PageHeader = ({ title, description }: PageHeaderProps) => {
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-bold tracking-tight text-white">{title}</h1>
      <p className="mt-1 text-gray-400">{description}</p>
    </div>
  );
};

export default PageHeader;