"""
Memory simulation engine for LowLogic
Simulates C++-like memory behavior with stack, heap, and pointer tracking
"""

import struct
from typing import Dict, List, Any, Optional, Union, Set
from dataclasses import dataclass, field
from enum import Enum
import uuid


class MemoryRegion(Enum):
    STACK = "stack"
    HEAP = "heap"
    STATIC = "static"
    CODE = "code"


@dataclass
class MemoryLocation:
    """Represents a location in memory"""
    address: int
    size: int
    value: Any
    type_name: str
    region: MemoryRegion
    name: Optional[str] = None
    is_pointer: bool = False
    pointer_target: Optional[int] = None
    allocation_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "address": f"0x{self.address:08x}",
            "size": self.size,
            "value": self.value,
            "type": self.type_name,
            "region": self.region.value,
            "name": self.name,
            "is_pointer": self.is_pointer,
            "pointer_target": f"0x{self.pointer_target:08x}" if self.pointer_target else None,
            "allocation_id": self.allocation_id
        }


@dataclass
class StackFrame:
    """Represents a function call stack frame"""
    function_name: str
    return_address: int
    base_pointer: int
    local_variables: Dict[str, MemoryLocation] = field(default_factory=dict)
    parameters: Dict[str, MemoryLocation] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "function_name": self.function_name,
            "return_address": f"0x{return_address:08x}",
            "base_pointer": f"0x{base_pointer:08x}",
            "local_variables": {name: var.to_dict() for name, var in self.local_variables.items()},
            "parameters": {name: param.to_dict() for name, param in self.parameters.items()}
        }


@dataclass
class HeapAllocation:
    """Represents a heap allocation"""
    allocation_id: str
    address: int
    size: int
    data: bytearray
    is_freed: bool = False
    ref_count: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "allocation_id": self.allocation_id,
            "address": f"0x{self.address:08x}",
            "size": self.size,
            "data": list(self.data),
            "is_freed": self.is_freed,
            "ref_count": self.ref_count
        }


class MemoryManager:
    """Manages memory simulation for LowLogic execution"""

    def __init__(self):
        # Memory layout
        self.stack_base = 0x7FFFFFF0000  # High addresses for stack
        self.heap_base = 0x10000000      # Lower addresses for heap
        self.static_base = 0x60000000    # Static memory region

        # Current pointers
        self.stack_pointer = self.stack_base
        self.heap_pointer = self.heap_base
        self.static_pointer = self.static_base

        # Memory storage
        self.memory: Dict[int, MemoryLocation] = {}  # address -> MemoryLocation
        self.heap_allocations: Dict[str, HeapAllocation] = {}  # allocation_id -> HeapAllocation
        self.address_to_allocation: Dict[int, str] = {}  # address -> allocation_id

        # Stack management
        self.call_stack: List[StackFrame] = []
        self.global_variables: Dict[str, MemoryLocation] = {}

        # Pointer tracking
        self.pointer_relationships: Dict[int, Set[int]] = {}  # pointer_addr -> set of target addresses
        self.reverse_pointers: Dict[int, Set[int]] = {}  # target_addr -> set of pointer addresses

        # Memory tracking for visualization
        self.memory_changes: List[Dict[str, Any]] = []

    def reset(self):
        """Reset memory manager to initial state"""
        self.memory.clear()
        self.heap_allocations.clear()
        self.address_to_allocation.clear()
        self.call_stack.clear()
        self.global_variables.clear()
        self.pointer_relationships.clear()
        self.reverse_pointers.clear()
        self.memory_changes.clear()

        self.stack_pointer = self.stack_base
        self.heap_pointer = self.heap_base
        self.static_pointer = self.static_base

    def allocate_stack(self, size: int, type_name: str, name: Optional[str] = None) -> MemoryLocation:
        """Allocate memory on the stack"""
        self.stack_pointer -= size
        address = self.stack_pointer

        # Initialize with zero bytes
        value = self._get_default_value(type_name)

        location = MemoryLocation(
            address=address,
            size=size,
            value=value,
            type_name=type_name,
            region=MemoryRegion.STACK,
            name=name
        )

        self.memory[address] = location

        # Add to current stack frame if exists
        if self.call_stack:
            self.call_stack[-1].local_variables[name or f"var_{address}"] = location
        else:
            # Global variable
            if name:
                self.global_variables[name] = location

        self._track_memory_change("allocate_stack", location)
        return location

    def allocate_heap(self, size: int, type_name: str) -> HeapAllocation:
        """Allocate memory on the heap"""
        allocation_id = str(uuid.uuid4())
        address = self.heap_pointer
        self.heap_pointer += size

        allocation = HeapAllocation(
            allocation_id=allocation_id,
            address=address,
            size=size,
            data=bytearray(size)
        )

        self.heap_allocations[allocation_id] = allocation
        self.address_to_allocation[address] = allocation_id

        self._track_memory_change("allocate_heap", {
            "allocation_id": allocation_id,
            "address": address,
            "size": size
        })

        return allocation

    def free_heap(self, allocation_id: str):
        """Free heap allocation"""
        if allocation_id in self.heap_allocations:
            allocation = self.heap_allocations[allocation_id]
            allocation.is_freed = True

            # Clear any pointers to this allocation
            address = allocation.address
            if address in self.reverse_pointers:
                for pointer_addr in self.reverse_pointers[address]:
                    self.clear_pointer(pointer_addr)

            self._track_memory_change("free_heap", {
                "allocation_id": allocation_id
            })

    def create_pointer(self, target_address: Optional[int], pointer_type: str, name: Optional[str] = None) -> MemoryLocation:
        """Create a pointer variable"""
        # Pointer size is 8 bytes (64-bit addresses)
        location = self.allocate_stack(8, pointer_type, name)
        location.is_pointer = True
        location.pointer_target = target_address

        if target_address:
            self._update_pointer_relationship(location.address, target_address)

        self._track_memory_change("create_pointer", location)
        return location

    def update_pointer(self, pointer_addr: int, new_target: Optional[int]):
        """Update pointer to point to new target"""
        if pointer_addr not in self.memory:
            return

        location = self.memory[pointer_addr]
        old_target = location.pointer_target

        # Remove old relationship
        if old_target:
            self._remove_pointer_relationship(pointer_addr, old_target)

        # Update pointer
        location.pointer_target = new_target
        location.value = new_target

        # Add new relationship
        if new_target:
            self._update_pointer_relationship(pointer_addr, new_target)

        self._track_memory_change("update_pointer", {
            "pointer_address": pointer_addr,
            "old_target": old_target,
            "new_target": new_target
        })

    def clear_pointer(self, pointer_addr: int):
        """Set pointer to null"""
        self.update_pointer(pointer_addr, None)

    def write_memory(self, address: int, value: Any, type_name: str) -> bool:
        """Write value to memory location"""
        if address not in self.memory:
            return False

        old_value = self.memory[address].value
        self.memory[address].value = value

        self._track_memory_change("write_memory", {
            "address": address,
            "old_value": old_value,
            "new_value": value,
            "type": type_name
        })

        return True

    def read_memory(self, address: int) -> Optional[Any]:
        """Read value from memory location"""
        if address in self.memory:
            return self.memory[address].value
        return None

    def get_memory_location(self, address: int) -> Optional[MemoryLocation]:
        """Get memory location by address"""
        return self.memory.get(address)

    def push_stack_frame(self, function_name: str, return_address: int = 0):
        """Push new stack frame for function call"""
        frame = StackFrame(
            function_name=function_name,
            return_address=return_address,
            base_pointer=self.stack_pointer
        )
        self.call_stack.append(frame)

        self._track_memory_change("push_stack_frame", {
            "function_name": function_name,
            "return_address": return_address
        })

    def pop_stack_frame(self) -> Optional[StackFrame]:
        """Pop current stack frame"""
        if not self.call_stack:
            return None

        frame = self.call_stack.pop()
        self.stack_pointer = frame.base_pointer

        self._track_memory_change("pop_stack_frame", {
            "function_name": frame.function_name
        })

        return frame

    def get_variables(self) -> Dict[str, Any]:
        """Get all visible variables"""
        variables = {}

        # Global variables
        for name, location in self.global_variables.items():
            variables[name] = location.to_dict()

        # Current stack frame variables
        if self.call_stack:
            frame = self.call_stack[-1]
            for name, location in frame.local_variables.items():
                variables[name] = location.to_dict()
            for name, location in frame.parameters.items():
                variables[f"param_{name}"] = location.to_dict()

        return variables

    def get_call_stack(self) -> List[Dict[str, Any]]:
        """Get current call stack"""
        return [frame.to_dict() for frame in self.call_stack]

    def get_heap_state(self) -> List[Dict[str, Any]]:
        """Get current heap allocations"""
        return [alloc.to_dict() for alloc in self.heap_allocations.values() if not alloc.is_freed]

    def get_pointer_graph(self) -> Dict[str, List[str]]:
        """Get pointer relationships for visualization"""
        graph = {}
        for pointer_addr, targets in self.pointer_relationships.items():
            pointer_hex = f"0x{pointer_addr:08x}"
            graph[pointer_hex] = [f"0x{target:08x}" for target in targets]
        return graph

    def get_state(self) -> Dict[str, Any]:
        """Get complete memory state for serialization"""
        return {
            "variables": self.get_variables(),
            "call_stack": self.get_call_stack(),
            "heap_allocations": self.get_heap_state(),
            "pointer_graph": self.get_pointer_graph(),
            "memory_changes": self.memory_changes[-10:],  # Last 10 changes
            "stack_pointer": f"0x{self.stack_pointer:08x}",
            "heap_pointer": f"0x{self.heap_pointer:08x}",
            "static_pointer": f"0x{self.static_pointer:08x}"
        }

    def _get_default_value(self, type_name: str) -> Any:
        """Get default value for a type"""
        if type_name == "int":
            return 0
        elif type_name == "float":
            return 0.0
        elif type_name == "char":
            return '\0'
        elif type_name == "bool":
            return False
        elif type_name == "string":
            return ""
        else:
            return None

    def _update_pointer_relationship(self, pointer_addr: int, target_addr: int):
        """Update pointer relationship tracking"""
        if pointer_addr not in self.pointer_relationships:
            self.pointer_relationships[pointer_addr] = set()
        self.pointer_relationships[pointer_addr].add(target_addr)

        if target_addr not in self.reverse_pointers:
            self.reverse_pointers[target_addr] = set()
        self.reverse_pointers[target_addr].add(pointer_addr)

    def _remove_pointer_relationship(self, pointer_addr: int, target_addr: int):
        """Remove pointer relationship"""
        if pointer_addr in self.pointer_relationships:
            self.pointer_relationships[pointer_addr].discard(target_addr)

        if target_addr in self.reverse_pointers:
            self.reverse_pointers[target_addr].discard(pointer_addr)

    def _track_memory_change(self, change_type: str, data: Any):
        """Track memory changes for visualization"""
        change = {
            "type": change_type,
            "data": data,
            "timestamp": len(self.memory_changes)
        }
        self.memory_changes.append(change)

        # Keep only recent changes to avoid memory bloat
        if len(self.memory_changes) > 1000:
            self.memory_changes = self.memory_changes[-500:]