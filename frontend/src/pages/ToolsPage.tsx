import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Calculator,
  Calendar,
  Hash,
  ArrowLeftRight,
  Clock,
  Percent,
  DollarSign,
  Ruler,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';

/**
 * ToolsPage Component
 * Collection of useful utility tools
 */
const ToolsPage: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [activeToolId, setActiveToolId] = useState<string | null>(null);

  const tools = [
    { id: 'date-fixer', name: 'Date Fixer', icon: Calendar, color: 'blue' },
    { id: 'name-swapper', name: 'Name Swapper', icon: ArrowLeftRight, color: 'purple' },
    { id: 'basic-calculator', name: 'Basic Calculator', icon: Calculator, color: 'green' },
    { id: 'percentage-calculator', name: 'Percentage Calculator', icon: Percent, color: 'orange' },
    { id: 'unit-converter', name: 'Unit Converter', icon: Ruler, color: 'indigo' },
    { id: 'time-zone-converter', name: 'Time Zone Converter', icon: Clock, color: 'pink' },
    { id: 'tip-calculator', name: 'Tip Calculator', icon: DollarSign, color: 'teal' },
    { id: 'hash-generator', name: 'Hash Generator', icon: Hash, color: 'cyan' },
  ];

  const renderTool = (toolId: string) => {
    switch (toolId) {
      case 'date-fixer':
        return <DateFixerTool />;
      case 'name-swapper':
        return <NameSwapperTool />;
      case 'basic-calculator':
        return <BasicCalculatorTool />;
      case 'percentage-calculator':
        return <PercentageCalculatorTool />;
      case 'unit-converter':
        return <UnitConverterTool />;
      case 'time-zone-converter':
        return <TimeZoneConverterTool />;
      case 'tip-calculator':
        return <TipCalculatorTool />;
      case 'hash-generator':
        return <HashGeneratorTool />;
      default:
        return null;
    }
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; hover: string; text: string; gradient: string }> = {
      blue: { bg: 'bg-blue-500', hover: 'hover:bg-blue-600', text: 'text-blue-600', gradient: 'from-blue-500 to-blue-600' },
      purple: { bg: 'bg-purple-500', hover: 'hover:bg-purple-600', text: 'text-purple-600', gradient: 'from-purple-500 to-purple-600' },
      green: { bg: 'bg-green-500', hover: 'hover:bg-green-600', text: 'text-green-600', gradient: 'from-green-500 to-green-600' },
      orange: { bg: 'bg-orange-500', hover: 'hover:bg-orange-600', text: 'text-orange-600', gradient: 'from-orange-500 to-orange-600' },
      indigo: { bg: 'bg-indigo-500', hover: 'hover:bg-indigo-600', text: 'text-indigo-600', gradient: 'from-indigo-500 to-indigo-600' },
      pink: { bg: 'bg-pink-500', hover: 'hover:bg-pink-600', text: 'text-pink-600', gradient: 'from-pink-500 to-pink-600' },
      teal: { bg: 'bg-teal-500', hover: 'hover:bg-teal-600', text: 'text-teal-600', gradient: 'from-teal-500 to-teal-600' },
      cyan: { bg: 'bg-cyan-500', hover: 'hover:bg-cyan-600', text: 'text-cyan-600', gradient: 'from-cyan-500 to-cyan-600' },
    };
    return colors[color] || colors.blue;
  };

  if (activeToolId) {
    return (
      <div className="h-screen bg-gray-50 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8">
          <button
            onClick={() => setActiveToolId(null)}
            className="mb-6 text-gray-600 hover:text-gray-900 font-medium flex items-center gap-2"
          >
            ← Back to Tools
          </button>
          {renderTool(activeToolId)}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">Utility Tools</h1>
          </div>
          <p className="text-gray-600 text-lg">
            Quick access to helpful calculators and converters to make your life easier.
          </p>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const colors = getColorClasses(tool.color);
            return (
              <button
                key={tool.id}
                onClick={() => setActiveToolId(tool.id)}
                className="group bg-white border-2 border-gray-200 rounded-2xl p-6 hover:border-transparent hover:shadow-xl transition-all duration-300 text-left"
              >
                <div className={`w-14 h-14 bg-gradient-to-br ${colors.gradient} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {tool.name}
                </h3>
                <p className="text-gray-500 text-sm">
                  Click to open tool →
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Individual Tool Components
// ============================================================================

const DateFixerTool: React.FC = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [format, setFormat] = useState('ISO');

  const handleConvert = () => {
    try {
      const date = new Date(input);
      if (isNaN(date.getTime())) {
        setOutput('Invalid date');
        return;
      }

      switch (format) {
        case 'ISO':
          setOutput(date.toISOString());
          break;
        case 'US':
          setOutput(date.toLocaleDateString('en-US'));
          break;
        case 'EU':
          setOutput(date.toLocaleDateString('en-GB'));
          break;
        case 'UNIX':
          setOutput(Math.floor(date.getTime() / 1000).toString());
          break;
        case 'READABLE':
          setOutput(date.toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }));
          break;
        default:
          setOutput(date.toString());
      }
    } catch (error) {
      setOutput('Error converting date');
    }
  };

  return (
    <ToolCard title="Date Fixer" icon={Calendar} color="blue">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Input Date (any format)
          </label>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="2024-01-15, 01/15/2024, Jan 15 2024, etc."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Output Format
          </label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="ISO">ISO 8601 (2024-01-15T12:00:00.000Z)</option>
            <option value="US">US Format (1/15/2024)</option>
            <option value="EU">EU Format (15/01/2024)</option>
            <option value="UNIX">Unix Timestamp</option>
            <option value="READABLE">Readable (Monday, January 15, 2024 at 12:00 PM)</option>
          </select>
        </div>

        <button
          onClick={handleConvert}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Convert
        </button>

        {output && (
          <CopyableOutput value={output} />
        )}
      </div>
    </ToolCard>
  );
};

const NameSwapperTool: React.FC = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [mode, setMode] = useState<'firstName-lastName' | 'lastName-firstName'>('firstName-lastName');

  const handleSwap = () => {
    const lines = input.split('\n').filter(line => line.trim());
    const swapped = lines.map(line => {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 2) return line;

      if (mode === 'firstName-lastName') {
        // From "Last, First" to "First Last"
        const cleaned = line.replace(',', '').trim().split(/\s+/);
        return cleaned.reverse().join(' ');
      } else {
        // From "First Last" to "Last, First"
        return `${parts[parts.length - 1]}, ${parts.slice(0, -1).join(' ')}`;
      }
    });
    setOutput(swapped.join('\n'));
  };

  return (
    <ToolCard title="Name Swapper" icon={ArrowLeftRight} color="purple">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Conversion Mode
          </label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as any)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="firstName-lastName">Last, First → First Last</option>
            <option value="lastName-firstName">First Last → Last, First</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Input Names (one per line)
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Doe, John&#10;Smith, Jane"
            rows={6}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
          />
        </div>

        <button
          onClick={handleSwap}
          className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium"
        >
          Swap Names
        </button>

        {output && (
          <CopyableOutput value={output} multiline />
        )}
      </div>
    </ToolCard>
  );
};

const BasicCalculatorTool: React.FC = () => {
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');

  const handleClick = (value: string) => {
    if (value === 'C') {
      setDisplay('0');
      setExpression('');
    } else if (value === '=') {
      try {
        const result = eval(expression + display);
        setDisplay(result.toString());
        setExpression('');
      } catch {
        setDisplay('Error');
      }
    } else if (['+', '-', '×', '÷'].includes(value)) {
      setExpression(display + value.replace('×', '*').replace('÷', '/'));
      setDisplay('0');
    } else {
      setDisplay(display === '0' ? value : display + value);
    }
  };

  const buttons = [
    ['7', '8', '9', '÷'],
    ['4', '5', '6', '×'],
    ['1', '2', '3', '-'],
    ['0', '.', '=', '+'],
    ['C'],
  ];

  return (
    <ToolCard title="Basic Calculator" icon={Calculator} color="green">
      <div className="space-y-4">
        <div className="bg-gray-100 p-4 rounded-lg">
          <div className="text-sm text-gray-500 h-6">{expression}</div>
          <div className="text-3xl font-bold text-gray-900 text-right">{display}</div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {buttons.flat().map((btn, idx) => (
            <button
              key={idx}
              onClick={() => handleClick(btn)}
              className={`
                p-4 text-lg font-semibold rounded-lg transition-colors
                ${btn === 'C' ? 'col-span-4 bg-red-500 text-white hover:bg-red-600' :
                  btn === '=' ? 'bg-green-500 text-white hover:bg-green-600' :
                  ['+', '-', '×', '÷'].includes(btn) ? 'bg-blue-500 text-white hover:bg-blue-600' :
                  'bg-white border-2 border-gray-200 hover:border-green-500'}
              `}
            >
              {btn}
            </button>
          ))}
        </div>
      </div>
    </ToolCard>
  );
};

const PercentageCalculatorTool: React.FC = () => {
  const [value, setValue] = useState('');
  const [percentage, setPercentage] = useState('');
  const [result, setResult] = useState('');

  const calculate = () => {
    const val = parseFloat(value);
    const pct = parseFloat(percentage);
    if (!isNaN(val) && !isNaN(pct)) {
      const res = (val * pct) / 100;
      setResult(`${pct}% of ${val} = ${res.toFixed(2)}`);
    }
  };

  return (
    <ToolCard title="Percentage Calculator" icon={Percent} color="orange">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Value</label>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="100"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Percentage</label>
          <input
            type="number"
            value={percentage}
            onChange={(e) => setPercentage(e.target.value)}
            placeholder="15"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        <button
          onClick={calculate}
          className="w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 transition-colors font-medium"
        >
          Calculate
        </button>

        {result && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-orange-900 font-semibold text-lg">{result}</p>
          </div>
        )}
      </div>
    </ToolCard>
  );
};

const UnitConverterTool: React.FC = () => {
  const [value, setValue] = useState('');
  const [fromUnit, setFromUnit] = useState('m');
  const [toUnit, setToUnit] = useState('ft');
  const [result, setResult] = useState('');

  const conversions: Record<string, number> = {
    // Length (base: meters)
    m: 1,
    ft: 3.28084,
    in: 39.3701,
    km: 0.001,
    mi: 0.000621371,
    cm: 100,
  };

  const convert = () => {
    const val = parseFloat(value);
    if (!isNaN(val)) {
      const meters = val / conversions[fromUnit];
      const converted = meters * conversions[toUnit];
      setResult(`${val} ${fromUnit} = ${converted.toFixed(4)} ${toUnit}`);
    }
  };

  return (
    <ToolCard title="Unit Converter" icon={Ruler} color="indigo">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Value</label>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="100"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
            <select
              value={fromUnit}
              onChange={(e) => setFromUnit(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="m">Meters</option>
              <option value="ft">Feet</option>
              <option value="in">Inches</option>
              <option value="km">Kilometers</option>
              <option value="mi">Miles</option>
              <option value="cm">Centimeters</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
            <select
              value={toUnit}
              onChange={(e) => setToUnit(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="m">Meters</option>
              <option value="ft">Feet</option>
              <option value="in">Inches</option>
              <option value="km">Kilometers</option>
              <option value="mi">Miles</option>
              <option value="cm">Centimeters</option>
            </select>
          </div>
        </div>

        <button
          onClick={convert}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          Convert
        </button>

        {result && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <p className="text-indigo-900 font-semibold text-lg">{result}</p>
          </div>
        )}
      </div>
    </ToolCard>
  );
};

const TimeZoneConverterTool: React.FC = () => {
  const [time, setTime] = useState('');
  const [fromZone, setFromZone] = useState('America/New_York');
  const [toZone, setToZone] = useState('Europe/London');
  const [result, setResult] = useState('');

  const zones = [
    'America/New_York',
    'America/Los_Angeles',
    'America/Chicago',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney',
  ];

  const convert = () => {
    if (!time) return;
    try {
      const date = new Date(time);
      const converted = date.toLocaleString('en-US', { timeZone: toZone });
      setResult(`${time} (${fromZone}) = ${converted} (${toZone})`);
    } catch {
      setResult('Error converting time');
    }
  };

  return (
    <ToolCard title="Time Zone Converter" icon={Clock} color="pink">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
          <input
            type="datetime-local"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Zone</label>
            <select
              value={fromZone}
              onChange={(e) => setFromZone(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            >
              {zones.map(z => <option key={z} value={z}>{z.replace('_', ' ')}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To Zone</label>
            <select
              value={toZone}
              onChange={(e) => setToZone(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            >
              {zones.map(z => <option key={z} value={z}>{z.replace('_', ' ')}</option>)}
            </select>
          </div>
        </div>

        <button
          onClick={convert}
          className="w-full bg-pink-600 text-white py-3 rounded-lg hover:bg-pink-700 transition-colors font-medium"
        >
          Convert
        </button>

        {result && (
          <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
            <p className="text-pink-900 font-medium">{result}</p>
          </div>
        )}
      </div>
    </ToolCard>
  );
};

const TipCalculatorTool: React.FC = () => {
  const [billAmount, setBillAmount] = useState('');
  const [tipPercent, setTipPercent] = useState('15');
  const [people, setPeople] = useState('1');
  const [result, setResult] = useState<{ tip: string; total: string; perPerson: string } | null>(null);

  const calculate = () => {
    const bill = parseFloat(billAmount);
    const tip = parseFloat(tipPercent);
    const numPeople = parseInt(people);

    if (!isNaN(bill) && !isNaN(tip) && numPeople > 0) {
      const tipAmount = (bill * tip) / 100;
      const total = bill + tipAmount;
      const perPerson = total / numPeople;

      setResult({
        tip: tipAmount.toFixed(2),
        total: total.toFixed(2),
        perPerson: perPerson.toFixed(2),
      });
    }
  };

  return (
    <ToolCard title="Tip Calculator" icon={DollarSign} color="teal">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Bill Amount</label>
          <input
            type="number"
            value={billAmount}
            onChange={(e) => setBillAmount(e.target.value)}
            placeholder="50.00"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tip Percentage ({tipPercent}%)
          </label>
          <input
            type="range"
            min="0"
            max="30"
            step="1"
            value={tipPercent}
            onChange={(e) => setTipPercent(e.target.value)}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0%</span>
            <span>15%</span>
            <span>30%</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Split Between</label>
          <input
            type="number"
            min="1"
            value={people}
            onChange={(e) => setPeople(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>

        <button
          onClick={calculate}
          className="w-full bg-teal-600 text-white py-3 rounded-lg hover:bg-teal-700 transition-colors font-medium"
        >
          Calculate
        </button>

        {result && (
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-teal-700">Tip Amount:</span>
              <span className="font-semibold text-teal-900">${result.tip}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-teal-700">Total:</span>
              <span className="font-semibold text-teal-900">${result.total}</span>
            </div>
            <div className="flex justify-between border-t border-teal-200 pt-2">
              <span className="text-teal-700 font-medium">Per Person:</span>
              <span className="font-bold text-teal-900 text-lg">${result.perPerson}</span>
            </div>
          </div>
        )}
      </div>
    </ToolCard>
  );
};

const HashGeneratorTool: React.FC = () => {
  const [input, setInput] = useState('');
  const [hashes, setHashes] = useState<{ md5: string; sha1: string; sha256: string } | null>(null);

  const generateHashes = async () => {
    if (!input) return;

    const encoder = new TextEncoder();
    const data = encoder.encode(input);

    // SHA-256
    const sha256Buffer = await crypto.subtle.digest('SHA-256', data);
    const sha256 = Array.from(new Uint8Array(sha256Buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // SHA-1
    const sha1Buffer = await crypto.subtle.digest('SHA-1', data);
    const sha1 = Array.from(new Uint8Array(sha1Buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    setHashes({
      md5: 'MD5 not available in browser',
      sha1,
      sha256,
    });
  };

  return (
    <ToolCard title="Hash Generator" icon={Hash} color="cyan">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Input Text</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter text to hash..."
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent font-mono text-sm"
          />
        </div>

        <button
          onClick={generateHashes}
          className="w-full bg-cyan-600 text-white py-3 rounded-lg hover:bg-cyan-700 transition-colors font-medium"
        >
          Generate Hashes
        </button>

        {hashes && (
          <div className="space-y-3">
            <CopyableOutput label="SHA-256" value={hashes.sha256} />
            <CopyableOutput label="SHA-1" value={hashes.sha1} />
          </div>
        )}
      </div>
    </ToolCard>
  );
};

// ============================================================================
// Utility Components
// ============================================================================

interface ToolCardProps {
  title: string;
  icon: React.ElementType;
  color: string;
  children: React.ReactNode;
}

const ToolCard: React.FC<ToolCardProps> = ({ title, icon: Icon, color, children }) => {
  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'from-blue-500 to-blue-600',
      purple: 'from-purple-500 to-purple-600',
      green: 'from-green-500 to-green-600',
      orange: 'from-orange-500 to-orange-600',
      indigo: 'from-indigo-500 to-indigo-600',
      pink: 'from-pink-500 to-pink-600',
      teal: 'from-teal-500 to-teal-600',
      cyan: 'from-cyan-500 to-cyan-600',
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      <div className={`bg-gradient-to-r ${getColorClasses(color)} p-6`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <Icon className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">{title}</h2>
        </div>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

interface CopyableOutputProps {
  value: string;
  label?: string;
  multiline?: boolean;
}

const CopyableOutput: React.FC<CopyableOutputProps> = ({ value, label, multiline = false }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      )}
      <div className="relative">
        {multiline ? (
          <textarea
            value={value}
            readOnly
            rows={6}
            className="w-full px-4 py-2 pr-12 bg-gray-50 border border-gray-300 rounded-lg font-mono text-sm resize-none"
          />
        ) : (
          <input
            type="text"
            value={value}
            readOnly
            className="w-full px-4 py-2 pr-12 bg-gray-50 border border-gray-300 rounded-lg font-mono text-sm"
          />
        )}
        <button
          onClick={handleCopy}
          className="absolute right-2 top-2 p-2 hover:bg-gray-200 rounded-lg transition-colors"
          title="Copy to clipboard"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-600" />
          ) : (
            <Copy className="w-4 h-4 text-gray-600" />
          )}
        </button>
      </div>
    </div>
  );
};

export default ToolsPage;
