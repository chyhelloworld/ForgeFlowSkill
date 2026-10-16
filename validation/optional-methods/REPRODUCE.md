# 复现可选方法测试

在包根目录执行。仅创建新的隔离fixture目录，不在真实项目运行测试脚本。需要Python、PyYAML和项目本地Node CLI构建；构建依赖与固定来源见 tools/openspec/README.md。不要全局安装。

```sh
python tools/validate_package.py .
python tools/test_validate_package.py .
python -m unittest discover -s tools -p test_spec_lifecycle.py -v
# 先按 tools/openspec/README.md 构建并验证项目本地CLI，再执行：
export FF_CLI="$PWD/tools/openspec/ff-spec.mjs"
export FF_SCHEMAS="$PWD/templates/optional-methods/openspec/schemas"
python validation/optional-methods/test_optional_cli.py ../optional-test-baseline
python validation/optional-methods/test_delivered_schemas.py "$FF_SCHEMAS" ../optional-test-schemas
python validation/optional-methods/test_delivered_lifecycle.py ../optional-test-lifecycle
```

输出目录必须不存在；复跑换新目录。脚本生成的review与作者内容明确为合成测试数据，不可复制成真实项目审核或批准。预期拒绝的命令退出1是通过断言的一部分，不应把所有命令退出0当目标。

发布包日志把执行环境绝对路径换成 <test-root> / <package> / <fixture>，保留命令参数、退出码与业务结果。复现将生成当前机器的真实路径日志。模型模拟是一次独立测试上下文中同一模型自构作者fixture的受指示模拟，不是盲测或独立评审。精简导出省略两份重复输入，verify_simulation.py不能据此完整重放；见EXPORT-NOTES.md。不能用静态重放替代实际互动行为测试。
