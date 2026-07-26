const fs = require('fs');

let code = fs.readFileSync('miniapp/src/pages/Tasks.jsx', 'utf8');

code = code.replace(
  `                {selectedTask.verification_type === 'auto_ad' && (
                  <div className="bg-surface-soft border border-border rounded-xl p-4 mt-3">
                    <p className="text-sm font-bold text-ink mb-2 flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-indigo-500" />
                      Required Rules
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2 text-sm text-ink-soft">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                        <span className="leading-tight">You must watch the entire ad to get the reward.</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm text-ink-soft">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                        <span className="leading-tight">Skipping or closing the ad early will cancel the reward.</span>
                      </li>
                    </ul>
                  </div>
                )}`,
  `                {selectedTask.verification_type === 'auto_ad' && (
                  <div className="bg-surface-soft border border-border rounded-xl p-4 mt-3">
                    <p className="text-sm font-bold text-danger mb-2 flex items-center gap-1.5">
                      <AlertCircle size={14} className="text-danger" />
                      Important Rule
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2 text-sm text-danger font-semibold">
                        <div className="w-1.5 h-1.5 rounded-full bg-danger mt-1.5 shrink-0" />
                        <span className="leading-tight">Watch the ad for 15s AND click on it! No click = No Reward.</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm text-ink-soft mt-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                        <span className="leading-tight">Skipping or closing the ad early will also cancel the reward.</span>
                      </li>
                    </ul>
                  </div>
                )}`
);

code = code.replace(
  `: selectedTask.verification_type === 'auto_ad'
                            ? 'Watch Ad'`,
  `: selectedTask.verification_type === 'auto_ad'
                            ? 'Watch Ad Now'`
);

fs.writeFileSync('miniapp/src/pages/Tasks.jsx', code);
console.log('Successfully updated Tasks.jsx with red warning in drawer!');
