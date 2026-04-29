import React from 'react'
import { OshiCharacter } from '@/types'

interface OshiCardProps {
  characters: OshiCharacter[]
  columns?: number
}

const OshiCard: React.FC<OshiCardProps> = ({
  characters,
  columns = 4,
}) => {
  return (
    <div 
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {characters.map((char, i) => (
        <div 
          key={i} 
          className="oshi-card"
          style={{
            background: `linear-gradient(135deg, rgba(242,167,179,0.06) 0%, rgba(180,167,214,0.06) 100%)`,
          }}
        >
          {char.image && (
            <img 
              src={char.image}
              alt={char.name}
              className="w-full aspect-square object-cover rounded"
            />
          )}
          <div className="oshi-name">{char.name}</div>
          <div className="oshi-from">{char.from}</div>
        </div>
      ))}
    </div>
  )
}

export default OshiCard